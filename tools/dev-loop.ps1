<#
  One-command dev loop: backup -> assemble -> syntax check -> tests -> build -> packaging -> install -> smoke.

  Order matters: a forgotten assemble step is otherwise only caught later by the drift guard.

  Two hard-won details:
   - Every child runs in its own PowerShell process with output going to a temp FILE and stdin closed.
     Piping (`| Out-String`) waits for EOF, and adb's daemon / java inherit that pipe, so the loop could
     hang forever at install or around test #20. A file has no EOF semantics, and WaitForExit(ms) is a
     real hard stop (exit code 124 on timeout).
   - Children get a fully formed COMMAND STRING, not a scriptblock: a scriptblock referencing $node or
     $arguments is evaluated in the child, where those variables do not exist. That silently turned
     every step into a no-op that returned 0 (a 4.6 s "successful" loop).

  Usage:
    powershell -File tools/dev-loop.ps1 -Version 1.0.48 -VersionCode 49
    ... -SkipBackup / -SkipTests / -SkipBuild / -SkipInstall
#>
param(
  [string]$Version,
  [int]$VersionCode = 0,
  [switch]$SkipInstall,
  [switch]$SkipBackup,
  [switch]$SkipTests,
  [switch]$SkipBuild,
  [switch]$Fast
)

# -Fast: skip the full suite and the device smoke; keep assemble + build + install (~15 s).
if ($Fast) { $SkipTests = $true; $SkipSmoke = $true }
# 版本号形如 1.<minor>.<patch>：versionCode = minor*100 + patch；patch 逢百进一（1.2.99 → 1.3.00）。
if ($Version -match "^1\.(\d+)\.(\d+)$") { $VersionCode = [int]$Matches[1] * 100 + [int]$Matches[2] }
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$node = (Get-Command node).Source
$adb = (Resolve-Path '.\toolchain\platform-tools\adb.exe').Path

$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$logPath = Join-Path $logDir ("dev-loop-{0}.log" -f $stamp)
$steps = New-Object System.Collections.Generic.List[object]
$loopClock = [System.Diagnostics.Stopwatch]::StartNew()

function Run([string]$label, [string]$command, [int]$TimeoutSec = 120) {
  $outFile = [System.IO.Path]::GetTempFileName()
  $body = $command + " *> '" + $outFile + "'; `$code = `$LASTEXITCODE; if (`$null -eq `$code) { if (`$?) { `$code = 0 } else { `$code = 1 } }; exit `$code"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($body))
  $exit = 0
  $timedOut = $false
  try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'powershell'
    $psi.Arguments = '-NoProfile -ExecutionPolicy Bypass -EncodedCommand ' + $encoded
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardInput = $true
    $proc = [System.Diagnostics.Process]::Start($psi)
    try { $proc.StandardInput.Close() } catch {}
    if (-not $proc.WaitForExit($TimeoutSec * 1000)) {
      $timedOut = $true
      try { & taskkill /PID $proc.Id /T /F *> $null } catch { try { $proc.Kill() } catch {} }
      $exit = 124
    } else {
      $exit = $proc.ExitCode
    }
  } finally {
    $text = ''
    try { if (Test-Path $outFile) { $text = Get-Content -Path $outFile -Raw -ErrorAction SilentlyContinue } } catch {}
    if ($timedOut) { $text = "$text`r`n[timeout] $label exceeded ${TimeoutSec}s and was killed" }
    if ($text -and $text.Trim()) {
      Add-Content -Path $logPath -Value ("--- {0}`r`n{1}" -f $label, $text)
      Write-Host $text.TrimEnd()
    }
    Remove-Item $outFile -Force -ErrorAction SilentlyContinue
  }
  return $exit
}

function ShowTail([int]$count = 20) {
  Write-Host '      ---- log tail ----' -ForegroundColor Yellow
  if (Test-Path $logPath) { Get-Content $logPath -Tail $count | ForEach-Object { Write-Host ('      ' + $_) } }
  Write-Host ('      full log: ' + $logPath)
}

function Step([string]$name, [scriptblock]$body) {
  $clock = [System.Diagnostics.Stopwatch]::StartNew()
  & $body
  $ok = $LASTEXITCODE -eq 0
  $clock.Stop()
  $steps.Add([pscustomobject]@{Step = $name; Ok = $ok; Seconds = [Math]::Round($clock.Elapsed.TotalSeconds, 1)})
  if (-not $ok) {
    Write-Host ("FAIL  {0} ({1:n1}s)" -f $name, $clock.Elapsed.TotalSeconds) -ForegroundColor Red
    ShowTail
    throw "step failed: $name"
  }
  Write-Host ("ok    {0} ({1:n1}s)" -f $name, $clock.Elapsed.TotalSeconds) -ForegroundColor Green
}

if (-not $SkipBackup) {
  Step 'backup' {
    $dst = Join-Path 'backups' "loop-$stamp"
    New-Item -ItemType Directory -Force $dst | Out-Null
    Copy-Item 'app\src\main\java' (Join-Path $dst 'java') -Recurse -Force
    Copy-Item 'app\src\fragments' (Join-Path $dst 'fragments') -Recurse -Force
    Copy-Item 'app\src\main\assets' (Join-Path $dst 'assets') -Recurse -Force
    Copy-Item 'build.ps1' (Join-Path $dst 'build.ps1') -Force
    Write-Host "      -> $dst"
    $global:LASTEXITCODE = 0
  }
}

Step 'version sync' {
  # One place owns the version: keep the fragment constant, build.ps1 defaults and the test
  # literal in step with -Version, otherwise the About page drifts (1.1.71 vs 1.1.91).
  # 2026-11-18: this used to go through Run, which parks child output in a temp file; it was
  # observed running 0.0 s with no output and no file change, which is how "installed 1.3.91 /
  # about page 1.3.90" happens. Call node directly and print the outcome.
  if ($Version -match '^\d+\.\d+\.\d+$' -and $VersionCode -ge 1) {
    & $node tools\sync-version.mjs $Version $VersionCode
    $code = $LASTEXITCODE
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
  } else {
    Write-Host ('      skipped: -Version {0} / versionCode {1} is not a full version' -f $Version, $VersionCode)
  }
  $global:LASTEXITCODE = 0
}

Step 'assemble + syntax' {
  $code = Run 'assemble-app' "& powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\assemble-app.ps1 -Quiet" 180
  if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
  foreach ($file in @('app\src\main\assets\app.js', 'app\src\main\assets\native-adapter.js', 'app\src\main\assets\anchors.js')) {
    $code = Run "check $file" ("& '" + $node + "' --check '" + $file + "'") 60
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
  }
  $global:LASTEXITCODE = 0
}

if (-not $SkipTests) {
  Step 'tests' {
    # Each test gets its own process, file-backed output and a hard timeout (tools/test-all.mjs).
    $code = Run 'test-all' ("& '" + $node + "' tools\test-all.mjs") 900
    $global:LASTEXITCODE = $code
  }
}

if (-not $SkipBuild) {
  Step 'build + packaging' {
    $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', '.\build.ps1')
    if ($Version) { $arguments += @('-Version', $Version) }
    if ($VersionCode -gt 0) { $arguments += @('-VersionCode', "$VersionCode") }
    $code = Run 'build.ps1' ("& powershell " + ($arguments -join ' ')) 480
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
    $code = Run 'verify-web-apk' ("& '" + $node + "' tests\verify-web-apk.mjs") 120
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
    # 图标规格已并入 tests/suite-infra.test.mjs 的 icon-style 组，由上一段 test-all 覆盖；别再单独跑旧文件。
    $apk = Get-ChildItem dist\*.apk | Sort-Object LastWriteTime | Select-Object -Last 1
    $hash = (Get-FileHash $apk.FullName -Algorithm SHA256).Hash.Substring(0, 16)
    Write-Host ("      {0}  {1:n0} KB  sha256:{2}..." -f $apk.Name, ($apk.Length / 1KB), $hash)
    $global:LASTEXITCODE = 0
  }
}

if (-not $SkipInstall) {
  Step 'install + smoke' {
    $apk = (Get-ChildItem dist\*.apk | Sort-Object LastWriteTime | Select-Object -Last 1).FullName
    $code = Run 'adb install' ("& '" + $adb + "' install -r '" + $apk + "'") 300
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
    if (-not $SkipSmoke) {
      $code = Run 'device smoke' ("& '" + $node + "' tools\device.mjs smoke") 180
      if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
    }
    $global:LASTEXITCODE = 0
  }
}

$loopClock.Stop()
Write-Host ''
$steps | Format-Table -AutoSize | Out-String | Write-Host
Write-Host ("total {0:n1}s" -f $loopClock.Elapsed.TotalSeconds)
Write-Host 'dev loop passed' -ForegroundColor Green
