import fs from 'node:fs';
let html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const from = '<h2>下周计划</h2>';
if (html.includes(from)) { html = html.replace(from, '<h2>训练计划</h2>'); console.log('renamed to 训练计划'); }
fs.writeFileSync('app/src/main/assets/index.html', html);
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.06';", "const APP_VERSION = '1.1.07';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.06',[int]$VersionCode=107)", "param([switch]$Clean,[string]$Version='1.1.07',[int]$VersionCode=108)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.06'", "const APP_VERSION = '1.1.07'"],
];
for (const [file, a, b] of plan) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, t.replace(a, b));
}
console.log('bumped to 1.1.07');
