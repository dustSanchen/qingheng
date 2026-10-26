import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
if (!css.includes('/* eyebrow is now a plain label */')) {
  css += '\n/* eyebrow is now a plain label — no English kickers left, so drop the uppercase tracking. */\n' +
    '.eyebrow{letter-spacing:0;text-transform:none;font-size:var(--text-sm);color:var(--muted);font-weight:500}\n';
  fs.writeFileSync(f, css);
  console.log('eyebrow restyled');
}
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.86';", "const APP_VERSION = '1.0.87';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.86',[int]$VersionCode=87)", "param([switch]$Clean,[string]$Version='1.0.87',[int]$VersionCode=88)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.86'", "const APP_VERSION = '1.0.87'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}
console.log('bumped to 1.0.87');
