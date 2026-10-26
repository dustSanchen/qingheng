/**
 * 第 9 轮：按调研结论拉大两套皮肤的区分度。
 *
 * 量化发现（CIE76 ΔE）：
 *   皮肤间画布 ΔE 1.71（<2 几乎看不出）
 *   卡 vs 画布 ΔE 1.04 / 1.50（参照产品：Things 3.91、Claude 6.73）
 *   → 之前的「两套皮肤」实际只有字体与圆角不同，色彩没起作用。
 *
 * 参照：
 *   Things：冷灰画布 #f2f5f7 + 纯白卡，卡靠色差浮起（ΔE 3.91），系统字体
 *   Linear：四级明度阶梯 + 发丝线，靠表面抬升做层级，密度高
 *   Claude：暖纸 #faf9f5 + 更深奶油卡（ΔE 6.73）
 *
 * 目标：皮肤间画布 ΔE ≥ 4，卡 vs 画布 ΔE ≥ 3.9；并让「密度 / 数字字体」也参与区分。
 */
import fs from 'node:fs';

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
let changed = 0;
const set = (name, value) => {
  const re = new RegExp('(' + name + '\\s*:\\s*)([^;]+);');
  if (!re.test(css)) { console.log('skip', name); return; }
  if (css.match(re)[2].trim() === value) { console.log('same', name); return; }
  css = css.replace(re, '$1' + value + ';'); changed++; console.log('ok  ', name, '->', value);
};

// 1) paper：更暖、更深一点，与冷灰的 ledger 拉开
set('--paper', '#f7f4ec');
set('--surface', '#fffdf7');

// 2) 新增密度与数字字体令牌
if (!css.includes('--card-pad')) {
  css = css.replace('  --measure:34em;', `  --measure:34em;
  --card-pad:var(--space-4);
  --card-gap:var(--space-3);
  --body-leading:1.65;
  --font-num:var(--font-ui);`);
  changed++;
  console.log('ok   density + numeric tokens');
}

// 3) ledger：冷灰画布（Things 实测）+ 紧凑密度 + 等宽数字
const ledgerBlock = `[data-skin="ledger"]{
  --paper:#f2f5f7;
  --surface:#ffffff;
  --line:#dfe3e8;
  --ink:#16181a;
  --body-text:#3a3d3c;
  --muted:#6a6d6b;
  --radius-sm:6px;
  --radius-md:10px;
  --radius-lg:14px;
  --measure:36em;
  --font-display:var(--font-ui);
  --card-pad:14px;
  --card-gap:10px;
  --body-leading:1.55;
  --font-num:ui-monospace,"SF Mono",Menlo,monospace;
}`;
css = css.replace(/\[data-skin="ledger"\]\{[\s\S]*?\n\}/, ledgerBlock);
changed++;
console.log('ok   ledger token block rewritten');

// 4) 让密度与数字字体真正生效
if (!css.includes('/* density + numerals follow the skin */')) {
  css += `
/* density + numerals follow the skin — the second axis of differentiation, not just colour. */
.card{padding:var(--card-pad);margin-bottom:var(--card-gap)}
.card p,.muted,.t-body,li,td{line-height:var(--body-leading)}
.macro-value,.ring-value,.stat b,#calorie-target,.plan-item b,.check-item b{font-family:var(--font-num)}
`;
  changed++;
  console.log('ok   density + numeral rules');
}

fs.writeFileSync('app/src/main/assets/styles.css', css);
console.log('changed:', changed);
