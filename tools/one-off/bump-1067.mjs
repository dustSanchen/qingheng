import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.66';", "const APP_VERSION = '1.0.67';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.66',[int]$VersionCode=67)", "param([switch]$Clean,[string]$Version='1.0.67',[int]$VersionCode=68)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.66'", "const APP_VERSION = '1.0.67'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}
console.log('bumped to 1.0.67');
