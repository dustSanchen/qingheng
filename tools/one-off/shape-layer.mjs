import fs from 'node:fs';

const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');

if (!css.includes('/* ---- shape layer')) {
  css += `
/* ---- shape layer：第二层是颜色，这一层是形状。纸感靠「无边框 + 大圆角」，账本靠「实线 + 小圆角」。 ---- */
:root{
  --shape-card-radius:16px;
  --shape-row-radius:12px;
  --shape-ctrl-radius:12px;
  --shape-card-shadow:0 1px 2px rgba(20,20,19,.045);
  --shape-row-shadow:none;
}
[data-skin="ledger"]{
  --shape-card-radius:5px;
  --shape-row-radius:4px;
  --shape-ctrl-radius:4px;
  --shape-card-shadow:none;
  --shape-row-shadow:none;
}

/* 卡片 */
.card{border-radius:var(--shape-card-radius);box-shadow:var(--shape-card-shadow)}
.day-more,.plan-prefs,.term-panel,.card-notes{border-radius:var(--shape-card-radius)}

/* 列表行与磁贴 */
.hub-row,.list-row,.meal-row,.capture-card,.check-item,.slot-hint,.photo-add,.segment-bar,.segment{border-radius:var(--shape-row-radius)}

/* 表单控件 */
input,select,textarea,.button,.chip,.term,.text-button{border-radius:var(--shape-ctrl-radius)}
.button.primary{border-radius:var(--shape-ctrl-radius)}

/* 账本：实线边框顶替阴影 */
[data-skin="ledger"] .card,
[data-skin="ledger"] .capture-card,
[data-skin="ledger"] .check-item,
[data-skin="ledger"] .slot-hint,
[data-skin="ledger"] .hub-row{border:1px solid var(--line)}
[data-skin="ledger"] .card{border-width:1px}
[data-skin="ledger"] .card-heading h2{letter-spacing:-.005em}
`;
  fs.writeFileSync(f, css);
  console.log('shape layer appended');
} else {
  console.log('shape layer already present');
}
