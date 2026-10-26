import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.20';", "const APP_VERSION = '1.0.21';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.20',[int]$VersionCode=21)", "param([switch]$Clean,[string]$Version='1.0.21',[int]$VersionCode=22)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.20'", "const APP_VERSION = '1.0.21'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
  console.log('bumped ' + file);
}
