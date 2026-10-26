import fs from 'node:fs';
const f = 'app/src/fragments/70-rest.fragment.js';
const t = fs.readFileSync(f, 'utf8');
const v = (t.match(/const APP_VERSION = '([\d.]+)'/)||[])[1];
const plan = [
  [f, `const APP_VERSION = '${v}';`, "const APP_VERSION = '1.1.30';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.29',[int]$VersionCode=130)", "param([switch]$Clean,[string]$Version='1.1.30',[int]$VersionCode=131)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.29'", "const APP_VERSION = '1.1.30'"],
];
for (const [file, a, b] of plan) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing for ' + a);
  fs.writeFileSync(file, s.replace(a, b));
}
console.log('bumped to 1.1.30');
