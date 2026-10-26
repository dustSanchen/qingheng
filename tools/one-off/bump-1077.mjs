import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.76';", "const APP_VERSION = '1.0.77';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.76',[int]$VersionCode=77)", "param([switch]$Clean,[string]$Version='1.0.77',[int]$VersionCode=78)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.76'", "const APP_VERSION = '1.0.77'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}
console.log('bumped to 1.0.77');
