import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
if (!css.includes('.energy-detail .button{')) {
  css += '\n/* 能量卡的两个按钮：留出呼吸，避免挤在一起。 */\n' +
    '.energy-detail{display:flex;flex-direction:column;align-items:flex-start;gap:var(--space-2)}\n' +
    '.energy-detail p{margin:0}\n' +
    '.energy-detail .button{margin-top:0}\n' +
    '.energy-detail .button + .button{margin-top:var(--space-1)}\n' +
    '.energy-detail .button.primary{margin-top:var(--space-2)}\n';
  fs.writeFileSync(f, css);
  console.log('energy button spacing added');
}
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.00';", "const APP_VERSION = '1.1.01';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.00',[int]$VersionCode=101)", "param([switch]$Clean,[string]$Version='1.1.01',[int]$VersionCode=102)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.00'", "const APP_VERSION = '1.1.01'"],
];
for (const [file, a, b] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(a, b));
}
console.log('bumped to 1.1.01');
