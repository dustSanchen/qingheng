import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.30';", "const APP_VERSION = '1.1.31';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.30',[int]$VersionCode=131)", "param([switch]$Clean,[string]$Version='1.1.31',[int]$VersionCode=132)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.30'", "const APP_VERSION = '1.1.31'"],
];
for (const [file, a, b] of plan) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, s.replace(a, b));
}
console.log('bumped to 1.1.31');
