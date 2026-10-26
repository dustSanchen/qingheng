import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.05';", "const APP_VERSION = '1.1.06';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.05',[int]$VersionCode=106)", "param([switch]$Clean,[string]$Version='1.1.06',[int]$VersionCode=107)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.05'", "const APP_VERSION = '1.1.06'"],
];
for (const [file, a, b] of plan) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, t.replace(a, b));
}
console.log('bumped to 1.1.06');
