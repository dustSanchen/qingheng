import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.64';", "const APP_VERSION = '1.0.65';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.64',[int]$VersionCode=65)", "param([switch]$Clean,[string]$Version='1.0.65',[int]$VersionCode=66)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.64'", "const APP_VERSION = '1.0.65'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}
console.log('bumped to 1.0.65');
