param([switch]$Clean,[string]$Version='1.4.98',[int]$VersionCode=498)
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$jdk=Get-ChildItem "$root\toolchain\jdk" -Directory | Select-Object -First 1
$java=Join-Path $jdk.FullName 'bin\java.exe';$javac=Join-Path $jdk.FullName 'bin\javac.exe';$jar=Join-Path $jdk.FullName 'bin\jar.exe';$keytool=Join-Path $jdk.FullName 'bin\keytool.exe'
$bt=Get-ChildItem "$root\toolchain\build-tools" -Directory | Select-Object -First 1
$plat=Get-ChildItem "$root\toolchain\platform" -Directory | Select-Object -First 1
$android=Join-Path $plat.FullName 'android.jar';$aapt=Join-Path $bt.FullName 'aapt2.exe';$zipalign=Join-Path $bt.FullName 'zipalign.exe';$d8=Join-Path $bt.FullName 'lib\d8.jar';$apksigner=Join-Path $bt.FullName 'lib\apksigner.jar'
foreach($p in @($java,$javac,$jar,$android,$aapt,$zipalign,$d8,$apksigner)){if(!(Test-Path $p)){throw "Missing build tool: $p"}}
# One place owns the version: the manifest link, the file name and the reported hash all read it.
if($Version -notmatch '^\d+\.\d+\.\d+$'){throw "Version must look like 1.2.3 (got '$Version')"}
if($VersionCode -lt 1){throw "VersionCode must be a positive integer (got '$VersionCode')"}
# -Version must equal the constant the About page shows: bypassing dev-loop used to ship 1.1.71 while the page said 1.1.91.
$appVersion=(Select-String -Path (Join-Path $root 'app\src\fragments\70-rest.fragment.js') -Pattern "APP_VERSION = '([0-9.]+)'").Matches.Groups[1].Value;
if($appVersion -and $appVersion -ne $Version){throw "Version $Version does not match APP_VERSION $appVersion in 70-rest.fragment.js; run tools/sync-version.mjs first"}
$apkName="qingheng-$Version.apk"
$build="$root\build";$dist="$root\dist";$sign="$root\.signing"
# Rebuild intermediates from scratch: javac does not delete the .class files of sources that were
# removed, so a deleted class would otherwise stay in classes.jar, in the dex and in the shipped APK.
Remove-Item "$build\classes","$build\dex","$build\rjava" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $build,$dist,$sign,"$build\classes","$build\dex","$build\rjava" | Out-Null
function Run($exe,$arglist){ $ErrorActionPreference="Continue"; & $exe @arglist; $code=$LASTEXITCODE; if($code -ne 0){throw "Build step failed: $exe ($code)"} }
# app/src/fragments/*.fragment.js are the source of truth for the WebView script; the packaged asset
# is their concatenation, rebuilt here so a packaged APK can never contain a stale app.js.
& powershell -NoProfile -ExecutionPolicy Bypass -File "$root\tools\assemble-app.ps1" -Quiet
if($LASTEXITCODE -ne 0){throw "Build step failed: assemble-app.ps1"}
Run $aapt @('compile','--dir',"$root\app\src\main\res",'-o',"$build\resources.zip")
# Stage the assets without editor leftovers: aapt2 packs the whole -A directory, so a *.bak-*
# file next to the shipped assets lands in the APK (668 KB instead of 467 KB once already).
$stage = "$build\assets-stage"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force $stage | Out-Null
$assetsRoot = "$root\app\src\main\assets"
Get-ChildItem $assetsRoot -Recurse -File | Where-Object { $_.Name -notmatch '(?i)\.(bak|tmp)([-_.].*)?$' } | ForEach-Object {
  $rel = $_.FullName.Substring($assetsRoot.Length + 1)
  $dest = Join-Path $stage $rel
  New-Item -ItemType Directory -Force (Split-Path -Parent $dest) | Out-Null
  Copy-Item $_.FullName $dest -Force
}
Run $aapt @('link','-o',"$build\unsigned.apk",'-I',$android,'--manifest',"$root\app\src\main\AndroidManifest.xml",'--min-sdk-version','26','--target-sdk-version','35','--version-code',"$VersionCode",'--version-name',$Version,'--java',"$build\rjava",'-A',$stage,"$build\resources.zip")
# Packaging guard (whitelist spirit): aapt2 on Windows turns an assets subdirectory into a
# backslash entry that Android silently 404s, and editor leftovers (.bak/.tmp) have shipped before.
# Failing the build here beats shipping a broken or bloated package.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$forbidden=@()
$apkZip=[System.IO.Compression.ZipFile]::OpenRead("$build\unsigned.apk")
try { foreach($entry in $apkZip.Entries){ if($entry.FullName -like '*\*' -or $entry.FullName -match '(?i)\.(bak|tmp)([-_.].*)?$' -or $entry.FullName -match '(?i)(thumbs\.db|\.ds_store)$'){ $forbidden+=$entry.FullName } } } finally { $apkZip.Dispose() }
if($forbidden.Count){ throw ("packaging guard: forbidden entries in APK: " + ($forbidden -join ', ')) }
Write-Host "packaging guard ok: no backslash entries, no .bak/.tmp leftovers."
$sources=Get-ChildItem "$root\app\src\main\java" -Recurse -Filter *.java | ForEach-Object FullName
$sources+=(Get-ChildItem "$build\rjava" -Recurse -Filter *.java | ForEach-Object FullName)
Run $javac (@('-encoding','UTF-8','-source','8','-target','8','-classpath',$android,'-d',"$build\classes")+$sources)
Run $jar @('cf',"$build\classes.jar",'-C',"$build\classes",'.')
Run $java @('-cp',$d8,'com.android.tools.r8.D8','--release','--min-api','26','--lib',$android,'--output',"$build\dex","$build\classes.jar")
Run $jar @('uf',"$build\unsigned.apk",'-C',"$build\dex",'classes.dex')
Run $zipalign @('-f','-p','4',"$build\unsigned.apk","$build\aligned.apk")
$key="$sign\qingheng-release.jks";$pass="$sign\password.txt";$pw=''
if(!(Test-Path $key)){ $pw=[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N');Set-Content -Path $pass -Value $pw -NoNewline -Encoding ASCII;Run $keytool @('-genkeypair','-keystore',$key,'-storepass', $pw,'-keypass', $pw,'-alias','qingheng','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Qingheng Personal App, O=Personal, C=CN') } else { $pw=(Get-Content -Raw -Encoding ASCII $pass).Trim() }
Run $java @('-jar',$apksigner,'sign','--ks',$key,'--ks-key-alias','qingheng','--ks-pass',"pass:$pw",'--key-pass',"pass:$pw",'--out',"$dist\$apkName","$build\aligned.apk")
Run $java @('-jar',$apksigner,'verify','--verbose','--print-certs',"$dist\$apkName")
Run $zipalign @('-c','-v','4',"$dist\$apkName")
# Hash is informational only: a missing Get-FileHash cmdlet must not fail the build.
try { Get-FileHash "$dist\$apkName" -Algorithm SHA256 | Format-List } catch {
  $sha=[System.Security.Cryptography.SHA256]::Create();$fs=[System.IO.File]::OpenRead("$dist\$apkName")
  try { $bytes=$sha.ComputeHash($fs) } finally { $fs.Dispose() }
  Write-Host ("SHA256 {0}" -f (($bytes | ForEach-Object { $_.ToString('x2') }) -join ''))
}
Write-Host "APK ready: dist/$apkName (versionName $Version, versionCode $VersionCode). Keep .signing private for future compatible updates."
