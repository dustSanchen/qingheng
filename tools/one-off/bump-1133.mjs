import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.32';", "const APP_VERSION = '1.1.33';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.32',[int]$VersionCode=133)", "param([switch]$Clean,[string]$Version='1.1.33',[int]$VersionCode=134)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.32'", "const APP_VERSION = '1.1.33'"],
];
for (const [file, a, b] of plan) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, s.replace(a, b));
}
console.log('bumped to 1.1.33');
