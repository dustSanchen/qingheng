import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
const from = 'text-decoration-thickness:1px}';
if (css.includes(from) && !css.includes('line-height:inherit')) {
  css = css.replace(from, 'text-decoration-thickness:1px;line-height:inherit;vertical-align:baseline}');
  fs.writeFileSync(f, css);
  console.log('ok  term line-height');
}
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.90';", "const APP_VERSION = '1.0.91';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.90',[int]$VersionCode=91)", "param([switch]$Clean,[string]$Version='1.0.91',[int]$VersionCode=92)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.90'", "const APP_VERSION = '1.0.91'"],
];
for (const [file, f2, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(f2).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(f2, to));
}
console.log('bumped to 1.0.91');
