#Requires -Version 5.1
<#
Publishes the showcase page to GitHub Pages (gh-pages branch).

The source now lives on public master like any normal repository, so this script
only refreshes the Pages branch from site/index.html. It never touches master.

Usage:
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\publish-pages.ps1 -Message "pages: 1.4.12"
#>
param(
  [Parameter(Mandatory = $true)][string]$Message,
  [string]$Remote = 'public'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$page = Join-Path $root 'site\index.html'
if (!(Test-Path $page)) { throw "missing file: $page" }

$blob = (git hash-object -w $page).Trim()
if ($LASTEXITCODE -ne 0) { throw 'hash-object failed' }
$nojekyll = ('' | git hash-object -w --stdin).Trim()

$index = Join-Path $root 'build\tmp-pages-index'
if (Test-Path $index) { Remove-Item $index -Force }
$env:GIT_INDEX_FILE = $index
try {
  git read-tree --empty
  git update-index --add --cacheinfo ("100644,{0},index.html" -f $blob)
  git update-index --add --cacheinfo ("100644,{0},.nojekyll" -f $nojekyll)
  $tree = (git write-tree).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'write-tree failed' }
  $commit = (git commit-tree $tree -m $Message).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'commit-tree failed' }
  git update-ref refs/heads/public-pages $commit
} finally {
  Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue
  if (Test-Path $index) { Remove-Item $index -Force }
}

git push $Remote ("{0}:gh-pages" -f $commit) --force
if ($LASTEXITCODE -ne 0) { throw 'push gh-pages failed' }
Write-Host "gh-pages: $commit -> $Remote/gh-pages"
