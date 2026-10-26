import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.28';", "const APP_VERSION = '1.1.29';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.28',[int]$VersionCode=129)", "param([switch]$Clean,[string]$Version='1.1.29',[int]$VersionCode=130)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.28'", "const APP_VERSION = '1.1.29'"],
];
for (const [file, a, b] of plan) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, s.replace(a, b));
}
console.log('bumped to 1.1.29');
