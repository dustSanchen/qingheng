import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
const from = '.energy-ring strong{font-size:26px}';
const to = '.energy-ring strong{font-size:22px;line-height:1.05}\n.energy-ring span{font-size:10px;margin-top:2px;letter-spacing:0}';
if (css.includes(from)) { css = css.replace(from, to); console.log('ok  ring type'); } else console.log('MISS ring type');
fs.writeFileSync(f, css);
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.99';", "const APP_VERSION = '1.1.00';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.99',[int]$VersionCode=100)", "param([switch]$Clean,[string]$Version='1.1.00',[int]$VersionCode=101)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.99'", "const APP_VERSION = '1.1.00'"],
];
for (const [file, a, b] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(a, b));
}
console.log('bumped to 1.1.00');
