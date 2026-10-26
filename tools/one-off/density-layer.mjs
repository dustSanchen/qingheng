import fs from 'node:fs';

const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');

if (!css.includes('/* ---- density layer')) {
  css += `
/* ---- density layer：账本更紧（表格感），纸感更松（阅读感）。 ---- */
[data-skin="ledger"]{
  --body-leading:1.5;
  --card-pad:13px;
  --card-gap:9px;
}
[data-skin="ledger"] .card-heading{margin-bottom:10px}
[data-skin="ledger"] .card-heading h2{font-size:var(--text-md);letter-spacing:0}
[data-skin="ledger"] .muted,[data-skin="ledger"] .fine-print{line-height:1.45}
[data-skin="ledger"] .hub-summary,[data-skin="ledger"] .row-head{line-height:1.4}

/* 纸感的阴影再淡一档，避免卡片「浮」得过头。 */
:root{--shape-card-shadow:0 1px 1px rgba(20,20,19,.035)}

/* 图表标签：数值密集时缩到 10px 会看不清，改为更小字重 + 更淡色，靠位置错开。 */
.chart-wrap text{font-variant-numeric:tabular-nums}
`;
  fs.writeFileSync(f, css);
  console.log('density layer appended');
} else {
  console.log('already present');
}
