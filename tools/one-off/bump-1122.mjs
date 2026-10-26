import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.21';", "const APP_VERSION = '1.1.22';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.21',[int]$VersionCode=122)", "param([switch]$Clean,[string]$Version='1.1.22',[int]$VersionCode=123)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.21'", "const APP_VERSION = '1.1.22'"],
];
for (const [file, a, b] of plan) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, t.replace(a, b));
}
console.log('bumped to 1.1.22');
