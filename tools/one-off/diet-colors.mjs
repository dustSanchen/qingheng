/**
 * 第 11 轮：饮食趋势配色减重。
 * 现状：条形填充 #6f8f74 @ .92（偏深绿）、超限 #a74638（砖红）、区间带 #c9dfc4 + 内描边 #a6c4a1，
 *       整块读起来发沉。目标：同色相、更低饱和、更高明度，条间对比仍然清楚。
 */
import fs from 'node:fs';

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
let n = 0;

// 1) 令牌
if (!css.includes('--diet-in:')) {
  css = css.replace('  --warn:#a8622c;', `  --warn:#a8622c;
  --diet-in:#87a98d;
  --diet-low:#d8b273;
  --diet-over:#cf9070;
  --diet-track:#eff2ec;
  --diet-band:#e9f0e3;
  --diet-band-line:#d5e1cb;`);
  n++; console.log('ok  paper 饮食令牌');
}
if (!css.includes('--diet-in:#7fa88c;')) {
  css = css.replace(/(\[data-skin="ledger"\]\{[\s\S]*?)(\n\})/, (m, head, tail) => head + `
  --diet-in:#7fa88c;
  --diet-low:#d3ad70;
  --diet-over:#c98d72;
  --diet-track:#eef1f0;
  --diet-band:#eaf1ec;
  --diet-band-line:#d6e2dc;` + tail);
  n++; console.log('ok  ledger 饮食令牌');
}

// 2) 规则改为引用令牌
const swaps = [
  ['.diet-bar{position:relative;flex:1 1 auto;height:10px;border-radius:999px;background:#eef1ea;overflow:hidden}',
   '.diet-bar{position:relative;flex:1 1 auto;height:8px;border-radius:999px;background:var(--diet-track);overflow:hidden}'],
  ['.diet-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--sage, #6f8f74)}',
   '.diet-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--diet-in)}'],
  ['.diet-bar i.over{background:var(--danger)}', '.diet-bar i.over{background:var(--diet-over)}'],
  ['background:#d9a441', 'background:var(--diet-low)'],
  ['background:#c9dfc4;box-shadow:inset 0 0 0 1px #a6c4a1', 'background:var(--diet-band);box-shadow:inset 0 0 0 1px var(--diet-band-line)'],
  ['.diet-key.in{color:#5f8467}', '.diet-key.in{color:var(--diet-in)}'],
  ['.diet-key.low{color:#b98524}', '.diet-key.low{color:var(--diet-low)}'],
  ['.diet-key.over{color:var(--danger)}', '.diet-key.over{color:var(--diet-over)}'],
  ['.diet-bar i{ z-index:1;opacity:.92}', '.diet-bar i{z-index:1;opacity:1}'],
  ['.diet-bar i{z-index:1;opacity:.92}', '.diet-bar i{z-index:1;opacity:1}'],
];
for (const [from, to] of swaps) {
  if (!css.includes(from)) { console.log('MISS', from.slice(0, 42)); continue; }
  css = css.replace(from, to); n++; console.log('ok  ', from.slice(0, 42));
}

// 3) 审计块也跟着轻一点
css = css.replace('background:#f6f8f3', 'background:var(--surface-soft)');

fs.writeFileSync('app/src/main/assets/styles.css', css);
console.log('changed:', n);
