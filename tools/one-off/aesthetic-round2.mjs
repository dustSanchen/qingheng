/**
 * 审美第二轮：不是换皮，而是把「数据密集型界面」的几个通用原则落到令牌上。
 * 参照的是公开可查的产品设计系统（线性/雨果/苹果 HIG 一类）的通用做法：
 *  - 数据用等宽数字，避免跳动
 *  - 一个圆角尺度、一个间距节奏
 *  - 动效尊重系统「减少动态效果」
 *  - 键盘焦点必须可见
 */
import fs from 'node:fs';

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
let changed = 0;

const addRule = (needle, block) => {
  if (css.includes(needle)) return;
  css += '\n' + block + '\n';
  changed++;
};

addRule('/* data typography */', `/* data typography — metrics use tabular figures so values do not jitter as they change. */
.macro-value,.ring-value,.stat b,#calorie-target,#intake-total,.plan-item b,.check-item b{font-variant-numeric:tabular-nums;letter-spacing:.2px}`);

addRule('/* one chip shape */', `/* one chip shape — chips and tags share a radius and a height. */
.tag,.quick-chip,.plan-suggest,.check-tag,.chip{border-radius:var(--radius-sm);padding:2px 8px;line-height:1.6}`);

addRule('@media (prefers-reduced-motion: reduce)', `@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}
}`);

addRule('/* visible keyboard focus */', `/* visible keyboard focus — never remove the ring, only restyle it. */
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:var(--radius-sm)}
button:focus:not(:focus-visible),a:focus:not(:focus-visible){outline:none}`);

addRule('/* section rhythm */', `/* section rhythm — headings sit one step above body, never flush against the edge. */
.card-heading{display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-3)}
.card-heading h2{margin:0}
.card > .fine-print:last-child{margin-bottom:0}`);

if (changed) {
  fs.writeFileSync('app/src/main/assets/styles.css', css);
}
console.log('aesthetic rules added:', changed);

// 给本地库加一条「审美依据」说明，便于以后追溯为什么这样改
const lib = 'app/src/main/assets/training-principles.js';
let t = fs.readFileSync(lib, 'utf8');
if (!t.includes('designNotes')) {
  t = t.replace("  note: '本地健身/减脂知识库",
`  /** 界面审美依据（非训练内容）：令牌化排版、数据等宽数字、单一圆角尺度、动效降级、可见焦点环。 */
  designNotes: {
    basis: '公开可查的产品设计系统通用做法（令牌化字阶/间距、tabular-nums、prefers-reduced-motion、focus-visible）',
    appliedIn: '1.0.62 令牌化，1.0.63 数据排版与可访问性',
    limit: '无法浏览所谓「opus 作品集」（不存在公开语料），因此以公开设计系统为依据，不冒充某位作者风格。'
  },
  note: '本地健身/减脂知识库`);
  fs.writeFileSync(lib, t);
  console.log('design notes recorded');
}
