import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
let n = 0;
// 1) notice 不再参与 surface-soft 分组
const before = '.diet-audit,.plan-cue,.notice,details summary{background:var(--surface-soft)}';
if (css.includes(before)) { css = css.replace(before, '.diet-audit,.plan-cue,details summary{background:var(--surface-soft)}'); n++; console.log('ok  notice 移出 surface-soft 分组'); }
// 2) surface-soft 本身调浅，避免土黄
css = css.replace(/--surface-soft:#efe9de;/, '--surface-soft:#f4f1e8;');
css = css.replace(/--surface-soft:\s*#efe9de;/, '--surface-soft:#f4f1e8;');
n++; console.log('ok  paper surface-soft 调浅');
// 3) ledger 也要有自己的 surface-soft（之前缺失，继承到暖色）
if (!css.includes('--surface-soft:#f2f5f4;')) {
  css = css.replace(/(\[data-skin="ledger"\]\{[\s\S]*?)(\n\})/, (m, head, tail) => head + '\n  --surface-soft:#f2f5f4;' + tail);
  n++; console.log('ok  ledger surface-soft');
}
fs.writeFileSync(f, css);
console.log('changed:', n);
console.log('notice 仍被土黄覆盖:', /\.notice[^{}]*\{[^}]*#efe9de/.test(css));
