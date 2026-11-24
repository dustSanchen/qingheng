<#
 * assemble-app.ps1 -- rebuild assets/app.js from the fragments in assets/app/.
 *
 * The generated file is what the WebView loads and what every test reads. Fragments are the source of
 * truth: edit them and re-run this (the build calls it automatically). Writing without a BOM keeps the
 * asset byte-identical to the fragments, which tests/suite-chat.test.mjs verifies.
#>
param([switch]$Quiet)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root 'app\src\fragments'
$target = Join-Path $root 'app\src\main\assets\app.js'

if (-not (Test-Path $dir)) { throw "fragment directory missing: $dir" }
$fragments = Get-ChildItem $dir -Filter *.fragment.js | Sort-Object Name
if ($fragments.Count -lt 2) { throw "expected several fragments in $dir, found $($fragments.Count)" }

# 模块化底座必须紧跟 00-head：05-core-runtime 提供 window.QH，后面每一片都靠它注册与通信。
# 位置错了不会报语法错，只会在运行时报「QH is not defined」，所以在这里先拦住。
$names = @($fragments | ForEach-Object { $_.Name })
$coreAt = [array]::IndexOf($names, '05-core-runtime.fragment.js')
if ($coreAt -lt 0) { throw "05-core-runtime.fragment.js is missing from $dir : the app would boot without window.QH" }
if ($coreAt -ne 1) { throw "05-core-runtime.fragment.js must sort right after 00-head.fragment.js, but it is at index $coreAt" }

$builder = New-Object System.Text.StringBuilder
foreach ($fragment in $fragments) {
    [void]$builder.Append([System.IO.File]::ReadAllText($fragment.FullName))
}
$text = $builder.ToString()
# Only rewrite when the content changed, so the build stays incremental and mtimes stay honest.
$existing = if (Test-Path $target) { [System.IO.File]::ReadAllText($target) } else { '' }
if ($existing -ne $text) {
    [System.IO.File]::WriteAllText($target, $text, (New-Object System.Text.UTF8Encoding($false)))
    if (-not $Quiet) { Write-Host ("assembled app.js from {0} fragments ({1} bytes)" -f $fragments.Count, $text.Length) }
} elseif (-not $Quiet) {
    Write-Host ("app.js already up to date ({0} fragments, {1} bytes)" -f $fragments.Count, $text.Length)
}
