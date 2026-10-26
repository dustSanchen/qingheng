import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.11';", "const APP_VERSION = '1.1.12';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.11',[int]$VersionCode=112)", "param([switch]$Clean,[string]$Version='1.1.12',[int]$VersionCode=113)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.11'", "const APP_VERSION = '1.1.12'"],
];
for (const [file, a, b] of plan) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, t.replace(a, b));
}
console.log('bumped to 1.1.12');
