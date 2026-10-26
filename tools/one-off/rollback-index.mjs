import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const open = (html.match(/<div\b/g)||[]).length, close = (html.match(/<\/div>/g)||[]).length;
console.log('div balance:', open, close, open===close?'OK':'MISMATCH');
console.log('photo-add:', html.includes('id="photo-add"'), '| photo-sheet:', html.includes('id="photo-sheet"'));
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.03';", "const APP_VERSION = '1.1.04';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.03',[int]$VersionCode=104)", "param([switch]$Clean,[string]$Version='1.1.04',[int]$VersionCode=105)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.03'", "const APP_VERSION = '1.1.04'"],
];
for (const [file, a, b] of plan) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, t.replace(a, b));
}
console.log('bumped to 1.1.04');
