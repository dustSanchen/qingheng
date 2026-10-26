/**
 * 修「全量测试/升级卡住」：
 *
 * 根因是 dev-loop 的 Run 用 `& $command 2>&1 | Out-String`。子进程（尤其 adb 的守护进程、
 * java、powershell 子进程）会继承这个管道句柄，只要有一个孙进程还活着，管道就读不到 EOF，
 * Out-String 永远不返回 —— 看起来就是「卡住」。真实案例：adb start-server 起了 daemon，
 * 循环停在 install 那一步不动；我自己的 foreach 全量测试同样会被 java/adb 句柄挂住。
 *
 * 修法：每个子步骤放到独立 PowerShell 进程里执行，输出重定向到临时文件，
 * stdin 接空文件，并用 WaitForExit(超时) 兜底；超时就杀掉整棵进程树并判失败。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

const oldRun = `function Run([string]$label, [scriptblock]$command) {
  $text = & $command 2>&1 | Out-String
  if ($text.Trim()) {
    Add-Content -Path $logPath -Value ("--- {0}`r`n{1}" -f $label, $text)
    Write-Host $text.TrimEnd()
  }
  return $LASTEXITCODE
}`;

const newRun = `<#
  Runs one child in its own PowerShell process, with output going to a temp FILE rather than a pipe.
  A pipe would be inherited by grandchildren (adb daemon, java), so reading it to EOF can block forever;
  a file has no EOF semantics, and WaitForExit(ms) guarantees this function returns.
  Returns: child exit code, or 124 on timeout (killed).
#>
function Run([string]$label, [scriptblock]$command, [int]$TimeoutSec = 120) {
  $outFile = [System.IO.Path]::GetTempFileName()
  $emptyIn = [System.IO.Path]::GetTempFileName()
  $body = "& { " + $command.ToString() + " } *> '" + $outFile + "'; exit `$LASTEXITCODE"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($body))
  $exit = 0
  $timedOut = $false
  try {
    $proc = Start-Process -FilePath 'powershell' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encoded) -PassThru -WindowStyle Hidden -RedirectStandardInput $emptyIn
    if (-not $proc.WaitForExit($TimeoutSec * 1000)) {
      $timedOut = $true
      try { & taskkill /PID $proc.Id /T /F *> $null } catch { try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {} }
      $exit = 124
    } else {
      $exit = $proc.ExitCode
    }
  } finally {
    $text = ''
    try { if (Test-Path $outFile) { $text = Get-Content -Path $outFile -Raw -ErrorAction SilentlyContinue } } catch {}
    if ($timedOut) { $text = ($text + "\`r`n[timeout] $label 超过 ${TimeoutSec}s，已终止") }
    if ($text -and $text.Trim()) {
      Add-Content -Path $logPath -Value ("--- {0}\`r\`n{1}" -f $label, $text)
      Write-Host $text.TrimEnd()
    }
    Remove-Item $outFile, $emptyIn -Force -ErrorAction SilentlyContinue
  }
  return $exit
}`;

patch('tools/dev-loop.ps1', [
  ['timeout-safe Run', oldRun, newRun],
]);

// 给耗时步骤更宽的超时，避免把慢构建误判成卡死
const timeouts = [
  ["    $code = Run 'assemble-app' { & powershell -NoProfile -ExecutionPolicy Bypass -File .\\tools\\assemble-app.ps1 -Quiet }",
   "    $code = Run 'assemble-app' { & powershell -NoProfile -ExecutionPolicy Bypass -File .\\tools\\assemble-app.ps1 -Quiet } 120"],
  ["      $code = Run (\"test \" + $file.Name) { & $node $file.FullName }",
   "      $code = Run (\"test \" + $file.Name) { & $node $file.FullName } 90"],
  ["    $code = Run 'build.ps1' { & powershell @arguments }",
   "    $code = Run 'build.ps1' { & powershell @arguments } 420"],
  ["    $code = Run 'adb install' { & $adb install -r $apk }",
   "    $code = Run 'adb install' { & $adb install -r $apk } 240"],
  ["    $code = Run 'device smoke' { & $node tools\\device.mjs smoke }",
   "    $code = Run 'device smoke' { & $node tools\\device.mjs smoke } 180"],
  ["    $code = Run 'verify-web-apk' { & $node tests\\verify-web-apk.mjs }",
   "    $code = Run 'verify-web-apk' { & $node tests\\verify-web-apk.mjs } 120"],
  ["    $code = Run 'icon-style' { & $node tests\\icon-style.test.mjs }",
   "    $code = Run 'icon-style' { & $node tests\\icon-style.test.mjs } 90"],
];
for (const [from, to] of timeouts) patch('tools/dev-loop.ps1', [['timeout ' + from.slice(15, 45), from, to]]);

console.log('dev-loop is now timeout-safe');
