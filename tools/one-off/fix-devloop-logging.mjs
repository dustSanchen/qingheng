import fs from 'node:fs';
const f='tools/dev-loop.ps1';
let t=fs.readFileSync(f,'utf8');
// Never discard output: keep a log, and on failure print its tail so the cause is visible.
t = t.replace(`$steps = New-Object System.Collections.Generic.List[object]`,
`$steps = New-Object System.Collections.Generic.List[object]
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$logPath = Join-Path $logDir ("dev-loop-{0}.log" -f $stamp)

<#
  Runs a command, keeps its output in the shared log, and returns the exit code. Output is never
  discarded: a swallowed error is exactly how the first version of this script hid a real build failure.
#>
function Run([string]$label, [scriptblock]$command) {
  $text = & $command 2>&1 | Out-String
  if ($text.Trim()) {
    Add-Content -Path $logPath -Value ("--- {0}`n{1}" -f $label, $text)
    Write-Host $text.TrimEnd()
  }
  return $LASTEXITCODE
}

function Tail([int]$count = 25) {
  if (Test-Path $logPath) { Get-Content $logPath -Tail $count | ForEach-Object { Write-Host ("      " + $_) } }
  Write-Host ("      full log: " + $logPath)
}`);
t = t.replace(`  $ok = $LASTEXITCODE -eq 0 -and -not $script:stepFailed`,
`  $ok = $LASTEXITCODE -eq 0`);
t = t.replace(`    Write-Host ("FAIL  {0} ({1:n1}s)" -f $name, $clock.Elapsed.TotalSeconds) -ForegroundColor Red
    throw "step failed: $name"`,
`    Write-Host ("FAIL  {0} ({1:n1}s)" -f $name, $clock.Elapsed.TotalSeconds) -ForegroundColor Red
    Tail
    throw "step failed: $name"`);
// Route every sub-command through Run so its output is captured.
t = t.replace(`  & powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\assemble-app.ps1 -Quiet
  $checks = @('app\src\main\assets\app.js', 'app\src\main\assets\native-adapter.js', 'app\src\main\assets\anchors.js')
  foreach ($file in $checks) {
    & $node --check $file
    if ($LASTEXITCODE -ne 0) { throw "syntax error in $file" }
  }
  $global:LASTEXITCODE = 0`,
`  $code = Run 'assemble' { & powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\assemble-app.ps1 -Quiet }
  if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
  foreach ($file in @('app\src\main\assets\app.js', 'app\src\main\assets\native-adapter.js', 'app\src\main\assets\anchors.js')) {
    $code = Run "check $file" { & $node --check $file }
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
  }
  $global:LASTEXITCODE = 0`);
t = t.replace(`    & powershell @arguments | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'build failed' }
    & $node tools\verify-web-apk.mjs *> $null
    if ($LASTEXITCODE -ne 0) { throw 'packaging check failed' }
    & $node tests\icon-style.test.mjs *> $null
    if ($LASTEXITCODE -ne 0) { throw 'icon style check failed' }`,
`    $code = Run 'build.ps1' { & powershell @arguments }
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
    $code = Run 'verify-web-apk' { & $node tools\verify-web-apk.mjs }
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
    $code = Run 'icon-style' { & $node tests\icon-style.test.mjs }
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }`);
t = t.replace(`    & $adb install -r $apk *> $null
    if ($LASTEXITCODE -ne 0) { throw 'install failed' }
    & $node tools\device.mjs smoke
    if ($LASTEXITCODE -ne 0) { throw 'device smoke found JS errors' }`,
`    $code = Run 'adb install' { & $adb install -r $apk }
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
    $code = Run 'device smoke' { & $node tools\device.mjs smoke }
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }`);
fs.writeFileSync(f,t);
console.log('dev-loop now keeps a log and prints failure tails');
