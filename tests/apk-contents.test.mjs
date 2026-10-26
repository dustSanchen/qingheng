import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const apkName = fs.readdirSync('dist').filter(name => /^qingheng-.*\.apk$/.test(name))
  .sort((a, b) => fs.statSync('dist/' + a).mtimeMs - fs.statSync('dist/' + b).mtimeMs).at(-1);
if (!apkName) throw new Error('No Qingheng APK found in dist');
const apk = 'dist/' + apkName;
const assets = 'app/src/main/assets/';
let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

// Read entries straight out of the shipped APK.
const zipPath = path.resolve('D:/AI/health-android/_verify.zip');
fs.copyFileSync(apk, zipPath);
const list = execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\//g, '\\\\')}'); $z.Entries | ForEach-Object { $_.FullName }; $z.Dispose()`], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
const readEntry = name => {
  const out = execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\//g, '\\\\')}'); $e=$z.Entries | Where-Object { $_.FullName -eq '${name}' }; $ms=New-Object IO.MemoryStream; $e.Open().CopyTo($ms); [Convert]::ToBase64String($ms.ToArray()); $z.Dispose()`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
  return Buffer.from(out, 'base64');
};
const dex = readEntry('classes.dex').toString('utf8');
const apkSeed = JSON.parse(readEntry('assets/seed.json').toString('utf8'));
const apkApp = readEntry('assets/app.js').toString('utf8');
const apkAdapter = readEntry('assets/native-adapter.js').toString('utf8');
fs.unlinkSync(zipPath);

check('no personal data in the packaged seed', apkSeed.measurements.length === 0 && apkSeed.meals.length === 0 && (apkSeed.notes || []).length === 0);
check('packaged seed has no demo dates', !JSON.stringify(apkSeed).includes('2026-07-05') && !JSON.stringify(apkSeed).includes('2026-10-10'));
check('packaged seed is the migration release', apkSeed.seedMigrated === 2 && apkSeed.onboardingDone === false);
check('dex has the markdown export route', dex.includes('/api/export-markdown'));
check('dex has the SAF text export bridge', dex.includes('exportText'));
check('dex has the seed migration marker', dex.includes('seedMigrated'));
check('dex has the onboarding flag', dex.includes('onboardingDone'));
check('dex carries no demo record ids', !/c39aab93|dcc1bd9f|b7916f40|4228198f|b251bb11|cda44a3a|fc172d13|75a5615b/.test(dex));
check('packaged app.js calls the markdown route', apkApp.includes("api('/api/export-markdown'"));
check('packaged app.js uses the exportText bridge', apkApp.includes('window.QinghengNative.exportText'));
check('packaged app.js gates onboarding on height too', apkApp.includes('number((state.profile || {}).height) === null'));
check('packaged app.js computes targets with Mifflin-St Jeor', apkApp.includes('10 * w + 6.25 * h - 5 *'));
check('packaged adapter routes markdown', apkAdapter.includes("path==='/api/export-markdown'"));
check('packaged adapter keeps the JS markdown fallback', apkAdapter.includes('function buildMarkdown('));
const sourceSeed = JSON.parse(fs.readFileSync(assets + 'seed.json', 'utf8'));
check('source seed matches packaged seed (by value)', JSON.stringify(sourceSeed) === JSON.stringify(apkSeed));

const sha = crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex').toUpperCase();
const size = fs.statSync(apk).size;
console.log('\nAPK SHA-256: ' + sha);
console.log('APK size   : ' + size + ' bytes');
console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
