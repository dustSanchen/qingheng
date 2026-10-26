import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.15';", "const APP_VERSION = '1.1.16';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.15',[int]$VersionCode=116)", "param([switch]$Clean,[string]$Version='1.1.16',[int]$VersionCode=117)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.15'", "const APP_VERSION = '1.1.16'"],
];
for (const [file, a, b] of plan) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, t.replace(a, b));
}
console.log('bumped to 1.1.16');
