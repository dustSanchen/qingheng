<#
  Timeout-safe full-suite runner.

  `foreach ($f in $files) { & node $f *> $null }` can hang forever: javac/java/adb children inherit the
  pipe, and PowerShell keeps waiting for EOF even though node exited. Here each test runs as its own
  process, output goes to a temp FILE (no EOF semantics), stdin is closed, and WaitForExit(ms) is the
  hard stop -- one stuck test can never freeze the suite.

  Usage:
    powershell -File tools/test-all.ps1
    powershell -File tools/test-all.ps1 -TimeoutSec 120 -Filter training
#>
param(
  [int]$TimeoutSec = 90,
  [string]$Filter = ''
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$node = (Get-Command node).Source

$files = @(Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name)
if ($Filter) { $files = @($files | Where-Object { $_.Name -like "*$Filter*" }) }
if ($files.Count -eq 0) { Write-Host 'no test files matched' -ForegroundColor Yellow; exit 1 }

$failed = New-Object System.Collections.Generic.List[string]
$timedOut = New-Object System.Collections.Generic.List[string]
$clock = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($file in $files) {
  $outFile = [System.IO.Path]::GetTempFileName()
  $body = "& '" + $node + "' '" + $file.FullName + "' *> '" + $outFile + "'; exit `$LASTEXITCODE"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($body))

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'powershell'
  $psi.Arguments = '-NoProfile -ExecutionPolicy Bypass -EncodedCommand ' + $encoded
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardInput = $true

  $childClock = [System.Diagnostics.Stopwatch]::StartNew()
  $proc = [System.Diagnostics.Process]::Start($psi)
  try { $proc.StandardInput.Close() } catch {}
  $finished = $proc.WaitForExit($TimeoutSec * 1000)
  $childClock.Stop()

  if (-not $finished) {
    try { & taskkill /PID $proc.Id /T /F *> $null } catch { try { $proc.Kill() } catch {} }
    $timedOut.Add($file.Name)
    Write-Host ("TIMEOUT {0} ({1:n1}s)" -f $file.Name, $childClock.Elapsed.TotalSeconds) -ForegroundColor Red
  } elseif ($proc.ExitCode -ne 0) {
    $failed.Add($file.Name)
    Write-Host ("FAIL    {0} ({1:n1}s)" -f $file.Name, $childClock.Elapsed.TotalSeconds) -ForegroundColor Red
    try { Get-Content $outFile -Tail 8 | ForEach-Object { Write-Host ('        ' + $_) } } catch {}
  } else {
    Write-Host ("ok      {0} ({1:n1}s)" -f $file.Name, $childClock.Elapsed.TotalSeconds)
  }
  Remove-Item $outFile -Force -ErrorAction SilentlyContinue
}

$clock.Stop()
Write-Host ''
Write-Host ("{0} run / {1} failed / {2} timeout / {3:n1}s" -f $files.Count, $failed.Count, $timedOut.Count, $clock.Elapsed.TotalSeconds)
if ($failed.Count) { Write-Host ('failed:  ' + ($failed -join ', ')) -ForegroundColor Red }
if ($timedOut.Count) { Write-Host ('timeout: ' + ($timedOut -join ', ')) -ForegroundColor Red }
if ($failed.Count -or $timedOut.Count) { exit 1 }
Write-Host 'all tests passed' -ForegroundColor Green
exit 0
