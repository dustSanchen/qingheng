import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.19';", "const APP_VERSION = '1.0.20';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.19',[int]$VersionCode=20)", "param([switch]$Clean,[string]$Version='1.0.20',[int]$VersionCode=21)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.19'", "const APP_VERSION = '1.0.20'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
  console.log('bumped ' + file);
}
