#Requires -Version 5.1
<#
Publishes the distribution-only content to the public GitHub repository.

The public repo must never receive source code. It contains exactly:
  README.md, LICENSE, site/index.html   (master branch)
  index.html, .nojekyll                 (gh-pages branch, mirror of site/index.html)

Usage:
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\publish-public.ps1 -Message "release 1.4.11"
  ... -SkipPages     only refresh master

Rollback: the previous public master commit is printed before the push; use
  git push public <old-sha>:master --force  to restore it.
#>
param(
  [Parameter(Mandatory = $true)][string]$Message,
  [switch]$SkipPages,
  [string]$Remote = 'public'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function New-TreeFromFiles([string[]]$pairs) {
  # pairs: "path-in-git=path-on-disk"
  $index = Join-Path $root 'build\tmp-public-index'
  if (Test-Path $index) { Remove-Item $index -Force }
  $env:GIT_INDEX_FILE = $index
  try {
    git read-tree --empty
    foreach ($pair in $pairs) {
      $spec = $pair.Split('=', 2)
      $gitPath = $spec[0]
      $diskPath = Join-Path $root $spec[1]
      if (!(Test-Path $diskPath)) { throw "missing file: $diskPath" }
      $blob = (git hash-object -w $diskPath).Trim()
      if ($LASTEXITCODE -ne 0) { throw "hash-object failed: $diskPath" }
      git update-index --add --cacheinfo ("100644,{0},{1}" -f $blob, $gitPath)
      if ($LASTEXITCODE -ne 0) { throw "update-index failed: $gitPath" }
    }
    $tree = (git write-tree).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'write-tree failed' }
    return $tree
  } finally {
    Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue
    if (Test-Path $index) { Remove-Item $index -Force }
  }
}

function New-EmptyBlob {
  return ('' | git hash-object -w --stdin).Trim()
}

$files = @('README.md=README.md', 'LICENSE=LICENSE', 'site/index.html=site/index.html')
$shotsDir = Join-Path $root 'site\shots'
if (Test-Path $shotsDir) {
  Get-ChildItem $shotsDir -Filter *.jpg | Sort-Object Name | ForEach-Object {
    $files += ('site/shots/{0}=site/shots/{0}' -f $_.Name)
  }
}
$tree = New-TreeFromFiles $files
$commit = (git commit-tree $tree -m $Message).Trim()
if ($LASTEXITCODE -ne 0) { throw 'commit-tree failed' }
git update-ref refs/heads/public $commit

$old = ''
try { $old = (git rev-parse "$Remote/master" 2>$null).Trim() } catch { }
Write-Host "public master: $old -> $commit"

git push $Remote ("{0}:master" -f $commit) --force
if ($LASTEXITCODE -ne 0) { throw 'push master failed' }

if (-not $SkipPages) {
  $pageBlob = (git hash-object -w site/index.html).Trim()
  $nojekyll = New-EmptyBlob
  $index = Join-Path $root 'build\tmp-pages-index'
  if (Test-Path $index) { Remove-Item $index -Force }
  $env:GIT_INDEX_FILE = $index
  try {
    git read-tree --empty
    git update-index --add --cacheinfo ("100644,{0},index.html" -f $pageBlob)
    git update-index --add --cacheinfo ("100644,{0},.nojekyll" -f $nojekyll)
    $pagesTree = (git write-tree).Trim()
    $pagesCommit = (git commit-tree $pagesTree -m ("pages: " + $Message)).Trim()
    git update-ref refs/heads/public-pages $pagesCommit
  } finally {
    Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue
    if (Test-Path $index) { Remove-Item $index -Force }
  }
  git push $Remote ("{0}:gh-pages" -f $pagesCommit) --force
  if ($LASTEXITCODE -ne 0) { throw 'push gh-pages failed' }
  Write-Host "gh-pages: $pagesCommit -> $Remote/gh-pages"
}

Write-Host 'public distribution published.'
Write-Host ('files: ' + (($files | ForEach-Object { $_.Split('=')[0] }) -join ', ') + ' (master); index.html, .nojekyll (gh-pages)')
