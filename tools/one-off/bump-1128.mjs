import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.27';", "const APP_VERSION = '1.1.28';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.27',[int]$VersionCode=128)", "param([switch]$Clean,[string]$Version='1.1.28',[int]$VersionCode=129)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.27'", "const APP_VERSION = '1.1.28'"],
];
for (const [file, a, b] of plan) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, t.replace(a, b));
}
console.log('bumped to 1.1.28');
