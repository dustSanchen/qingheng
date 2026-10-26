import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
console.log('capture-card present:', css.includes('.capture-card{'));
if (!css.includes('.capture-card{')) {
  css += '\n/* 拍照/相册：两枚中等卡并排（72px）。 */\n' +
    '.capture-actions{display:flex;gap:var(--space-2)}\n' +
    '.capture-card{flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:72px;padding:10px;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface);color:var(--body-text);font-size:var(--text-sm)}\n' +
    '.capture-card:active{background:var(--surface-soft)}\n' +
    '.capture-card img{width:var(--icon-lg);height:var(--icon-lg);opacity:.85}\n';
  fs.writeFileSync(f, css);
  console.log('added capture-card css');
}
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.04';", "const APP_VERSION = '1.1.05';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.04',[int]$VersionCode=105)", "param([switch]$Clean,[string]$Version='1.1.05',[int]$VersionCode=106)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.04'", "const APP_VERSION = '1.1.05'"],
];
for (const [file, a, b] of plan) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, t.replace(a, b));
}
console.log('bumped to 1.1.05');
