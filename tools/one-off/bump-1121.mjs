import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.20';", "const APP_VERSION = '1.1.21';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.20',[int]$VersionCode=121)", "param([switch]$Clean,[string]$Version='1.1.21',[int]$VersionCode=122)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.20'", "const APP_VERSION = '1.1.21'"],
];
for (const [file, a, b] of plan) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, t.replace(a, b));
}
console.log('bumped to 1.1.21');
