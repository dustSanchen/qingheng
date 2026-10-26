import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

// 1) 新来源纳入优先级（考据 > 口述 > 视频 > 整理图）
patch('app/src/main/assets/training-principles.js', [
  ['priority includes the guidelines',
   "  priority: ['asr-transcript', 'ksw-tcy-3split', 'community-digest', 'hrss-channel', 'tcy-channel', 'ksw-channel', 'alex-channel'],",
   "  priority: ['issn-2017', 'helms-2014', 'aasm-2015', 'asr-transcript', 'ksw-tcy-3split', 'community-digest', 'hrss-channel', 'tcy-channel', 'ksw-channel', 'alex-channel'],"],
  ['conflict policy names the guidelines',
   "  conflictPolicy: '训练计划与强度冲突 → 听 P1（三分化）；解剖与新手框架 → 听 P2（好人松松）；单动作细节 → 听 P3（谭成义）；有氧与拉伸执行 → 听 P5（ALEX）；热量、蛋白、缺口口径 → 以 App 规则为准，本库不得下调硬底线。',",
   "  conflictPolicy: '营养与睡眠的口径以学会立场声明（ISSN / AASM）优先；训练计划与强度听三分化；解剖与动作细节听好人松松与谭成义；有氧与拉伸听 ALEX；热量、蛋白、缺口硬底线始终由 App 规则兜底，任何来源都不得下调。',"],
]);

// 2) 审美：设计令牌 + 统一节奏（克制的排版/间距/层级调整）
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('/* design tokens */')) {
  css = `/* design tokens — one scale for type, spacing and radius; edit here, not per rule. */
:root{
  --ink:#22261f;
  --muted:#6f776c;
  --line:#e5e9df;
  --surface:#ffffff;
  --paper:#f6f8f2;
  --accent:#3f6b4a;
  --radius-sm:10px;
  --radius-md:14px;
  --radius-lg:18px;
  --space-1:4px;
  --space-2:8px;
  --space-3:12px;
  --space-4:16px;
  --space-5:24px;
  --text-xs:11px;
  --text-sm:12.5px;
  --text-md:13.5px;
  --text-lg:15.5px;
  --text-xl:22px;
}

` + css;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  design tokens');
}

const stylePatch = [
  ['.card{padding:18px;margin-bottom:14px;border-radius:20px}', '.card{padding:var(--space-4);margin-bottom:var(--space-3);border-radius:var(--radius-lg)}'],
  ['.card h2{font-size:15.5px}', '.card h2{font-size:var(--text-lg);letter-spacing:.1px}'],
  ['.muted{font-size:13px;line-height:1.5}', '.muted{font-size:var(--text-md);line-height:1.55}'],
  ['.fine-print{font-size:11.5px;line-height:1.5;margin:6px 0}', '.fine-print{font-size:var(--text-xs);line-height:1.5;margin:var(--space-1) 0}'],
  ['label{font-size:12.5px}', 'label{font-size:var(--text-sm)}'],
  ['.form-grid{gap:0 10px}', '.form-grid{gap:0 var(--space-3)}'],
];
let changed = 0;
for (const [from, to] of stylePatch) {
  if (css.includes(from)) { css = css.replace(from, to); changed++; }
}
if (changed) {
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  tokenised rules:', changed);
}

// 3) 标题层级：页面主标题收紧字距，卡片标题统一字重
if (!css.includes('.card h2{letter-spacing')) {
  css += `
/* Title hierarchy: one weight for card titles, one tighter tracking for page titles. */
.card h2{font-weight:600;letter-spacing:.1px}
.page-title,.hero-title,h1{letter-spacing:.2px}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  title hierarchy');
}

console.log('priority + aesthetic pass done');
