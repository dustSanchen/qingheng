import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.01';", "const APP_VERSION = '1.1.02';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.01',[int]$VersionCode=102)", "param([switch]$Clean,[string]$Version='1.1.02',[int]$VersionCode=103)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.01'", "const APP_VERSION = '1.1.02'"],
];
for (const [file, a, b] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(a, b));
}
console.log('bumped to 1.1.02');
