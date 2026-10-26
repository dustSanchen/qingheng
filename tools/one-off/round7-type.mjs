/**
 * 第 7 轮：字号层级固化 + 字体统一
 *
 * 现状：全站 23 种字号，只有 5 处用令牌；表单控件（input/select/button）默认用系统字体，
 * 与正文的 --font-ui 不一致——这是「看着不齐」的主要来源。
 *
 * 做法（保守且可验证）：
 *  1) 固化四层：页面标题 / 卡片标题 / 正文 / 脚注，写成 t-* 类并绑定到既有选择器
 *  2) 消掉过小字号：9/10/10.5/11.5/12px → 11 或 12.5（低于 11px 在手机上不可读）
 *  3) 表单控件字体继承正文（font:inherit + --font-ui）
 *  4) 大字号（≥16px，能量环与指标数字）保持不动——它们是显示级数字，不属于文本层级
 */
import fs from 'node:fs';

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const before = {};
for (const m of css.matchAll(/font-size:\s*([0-9.]+px)/g)) before[m[1]] = (before[m[1]] || 0) + 1;

// 1) 四层令牌（在 :root 里补齐 heading 级）
if (!css.includes('--text-heading')) {
  css = css.replace(/--text-lg\s*:\s*15\.5px;/, '--text-lg:15.5px;\n  --text-heading:18px;');
  console.log('ok  heading token');
}

// 2) 过小字号收敛（只动 12px 及以下，避免碰到显示级数字）
const smallMap = [
  ['font-size:9px', 'font-size:var(--text-xs)'],
  ['font-size:10px', 'font-size:var(--text-xs)'],
  ['font-size:10.5px', 'font-size:var(--text-xs)'],
  ['font-size:11px', 'font-size:var(--text-xs)'],
  ['font-size:11.5px', 'font-size:var(--text-xs)'],
  ['font-size:12px', 'font-size:var(--text-sm)']
];
let replaced = 0;
for (const [from, to] of smallMap) {
  const hits = css.split(from).length - 1;
  if (hits) { css = css.split(from).join(to); replaced += hits; console.log('ok  ', from, 'x' + hits); }
}

// 3) 四层层级 + 表单字体统一
if (!css.includes('/* type hierarchy */')) {
  css += `
/* type hierarchy — four levels only; new card text must pick one of these. */
.t-page{font-family:var(--font-display);font-size:var(--text-xl);line-height:1.25;letter-spacing:-.2px;color:var(--ink);font-weight:400}
.t-card{font-family:var(--font-display);font-size:var(--text-lg);line-height:1.35;color:var(--ink);font-weight:400}
.t-body{font-family:var(--font-ui);font-size:var(--text-md);line-height:1.65;color:var(--body-text)}
.t-note{font-family:var(--font-ui);font-size:var(--text-xs);line-height:1.6;color:var(--muted)}

/* bind the existing structure to those levels so nothing drifts by accident. */
.page-title,.hero-title,h1{font-family:var(--font-display);font-size:var(--text-xl);line-height:1.25;font-weight:400;letter-spacing:-.2px}
.card h2,.section-title,.screen-title{font-family:var(--font-display);font-size:var(--text-lg);line-height:1.35;font-weight:400}
.card p,.muted,li,td{font-family:var(--font-ui);font-size:var(--text-md);line-height:1.65}
.fine-print,details summary,caption,small{font-family:var(--font-ui);font-size:var(--text-xs);line-height:1.6}

/* form controls must inherit the same voice as body text, not the system default. */
button,input,select,textarea{font-family:var(--font-ui);font-size:var(--text-md);line-height:1.4}
`;
  console.log('ok   hierarchy + form fonts');
}
fs.writeFileSync('app/src/main/assets/styles.css', css);
console.log('small sizes normalised:', replaced);

const after = {};
for (const m of css.matchAll(/font-size:\s*([0-9.]+px)/g)) after[m[1]] = (after[m[1]] || 0) + 1;
console.log('distinct px sizes before:', Object.keys(before).length, '-> after:', Object.keys(after).length);
console.log('remaining small px:', Object.entries(after).filter(([k]) => parseFloat(k) <= 12).map(([k, v]) => k + 'x' + v).join(', ') || 'none');
