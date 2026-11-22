<#
 * verify-all.ps1 -- one command for the whole verification chain.
 *
 * Runs, in order and failing fast:
 *   1. every tests/*.test.mjs
 *   2. the build (build.ps1, which owns the version number)
 *   3. byte-level APK checks (tests/verify-web-apk.mjs)
 *   4. prints the APK path, SHA-256 and the version that was built
 *
 * Usage: powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\verify-all.ps1
 *        [-SkipBuild] [-Version 1.0.17 -VersionCode 18]
#>
param([switch]$SkipBuild, [string]$Version = '', [int]$VersionCode = 0)

# Native tools can write to stderr while still succeeding, and a failing suite writes a stack trace
# there. Exit codes are the source of truth here, so stderr must not abort the run.
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    $node = $null
    foreach ($candidate in @(
        (Join-Path $env:USERPROFILE '.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'),
        'node'
    )) {
        if ($candidate -eq 'node') { $node = 'node'; break }
        if (Test-Path $candidate) { $node = $candidate; break }
    }
    if (-not $node) { throw 'Node.js not found (looked for the DSH runtime and PATH)' }

    Write-Host '== tests' -ForegroundColor Cyan
    $failed = @()
    $suites = Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name
    foreach ($suite in $suites) {
        & $node $suite.FullName *> $null
        if ($LASTEXITCODE -ne 0) { $failed += $suite.Name; Write-Host ("FAIL  " + $suite.Name) -ForegroundColor Red }
        else { Write-Host ("ok    " + $suite.Name) }
    }
    Write-Host ("tests: {0} run, {1} failed" -f $suites.Count, $failed.Count)
    if ($failed.Count) { throw ("test failures: " + ($failed -join ', ')) }

    if (-not $SkipBuild) {
        Write-Host '== build' -ForegroundColor Cyan
        $args = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $root 'build.ps1'))
        if ($Version) { $args += @('-Version', $Version) }
        if ($VersionCode -gt 0) { $args += @('-VersionCode', "$VersionCode") }
        $build = & powershell @args 2>&1
        $ready = $build | Select-String -Pattern 'APK ready'
        if (-not $ready) { $build | Select-Object -Last 15; throw 'build failed' }
        Write-Host $ready.Line
    }

    Write-Host '== packaging checks' -ForegroundColor Cyan
    & $node tests\verify-web-apk.mjs *> $null
    if ($LASTEXITCODE -ne 0) { throw 'verify-web-apk failed' }
    Write-Host 'ok    verify-web-apk'
    # 图标规格（icon-style）已并入 tests/suite-infra.test.mjs，上面的 tests 段已经跑过，这里不再单独执行。

    $apk = Get-ChildItem dist -Filter *.apk | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $apk) { throw 'no APK in dist/' }
    $hash = (Get-FileHash $apk.FullName -Algorithm SHA256).Hash
    Write-Host ''
    Write-Host ('APK    : ' + $apk.FullName)
    Write-Host ('size   : ' + [math]::Round($apk.Length / 1KB, 1) + ' KB')
    Write-Host ('SHA256 : ' + $hash)
    Write-Host 'all checks passed' -ForegroundColor Green
} finally {
    Pop-Location
}
