/**
 * 第三轮审美：借鉴 claude.ai 公开界面可观察的表达方式——
 *   暖纸底、墨色文字、衬线标题、克制的强调、发丝级分隔线、留白优先。
 *
 * 说明（重要）：
 *  - Anthropic 的 /brand 页面现在返回 404，我没有官方色值可引用，因此这里用的是
 *    「公开界面可观察到的倾向」做的近似值，不声称是官方设计令牌。
 *  - 数据与正文仍然用无衬线，只有页面标题与卡片标题用衬线：中文长文全衬线会掉可读性。
 *  - 语义色（蛋白/脂肪/碳水、状态色）与图标底色保持不变，避免破坏既有可读性与测试。
 */
import fs from 'node:fs';

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
let changed = 0;

const swap = (from, to, label) => {
  if (!css.includes(from)) { console.log('skip', label); return; }
  css = css.replace(from, to);
  changed++;
  console.log('ok  ', label);
};

// 1) 色彩令牌：暖纸底 + 墨色 + 发丝线 + 暖灰次要文字
swap('--ink: #22261f;', '--ink: #1e1e1a;', 'ink');
swap('--muted: #6f776c;', '--muted: #6b6a63;', 'muted');
swap('--line: #e5e9df;', '--line: #e8e5dc;', 'line');
swap('--surface: #ffffff;', '--surface: #fffefb;', 'surface');
swap('--paper: #f6f8f2;', '--paper: #faf8f2;', 'paper');

// 2) 字体：标题衬线，数据/正文无衬线
if (!css.includes('--font-display')) {
  css = css.replace('  --text-xl:22px;',
    '  --text-xl:22px;\n  --font-display:"Iowan Old Style","Palatino Linotype","Songti SC","Noto Serif SC",Georgia,serif;\n  --font-ui:-apple-system,"PingFang SC","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;');
  changed++;
  console.log('ok   font tokens');
}

// 3) 标题用衬线，正文保持无衬线
if (!css.includes('.card h2{font-family:var(--font-display)')) {
  css += `
/* Claude-like typographic voice: serif for titles, sans for data and body. */
body{font-family:var(--font-ui)}
.page-title,.hero-title,h1,h2,.card h2,.section-title,.screen-title{font-family:var(--font-display);font-weight:600;letter-spacing:.2px}
.macro-value,.plan-item b,.check-item b,#calorie-target,.ring-value,.stat b{font-family:var(--font-ui)}

/* Warm hairline instead of a grey border; the card lifts with light, not with shadow contrast. */
.card{border-color:var(--line);box-shadow:0 1px 0 rgba(30,30,26,.035),0 8px 24px -18px rgba(30,30,26,.18)}
.card-heading h2{color:var(--ink)}
.fine-print,.muted{color:var(--muted)}
`;
  changed++;
  console.log('ok   serif titles + hairline');
}

// 4) 强调色块：把「纯白卡片 + 灰底」的对比柔化，贴近暖纸感
if (!css.includes('/* warm paper surfaces */')) {
  css += `
/* warm paper surfaces — page sits on paper, cards sit on paper with a lighter tone. */
body,.app-shell{background:var(--paper)}
.segment-bar,.records-tabs{background:rgba(255,254,251,.72)}
`;
  changed++;
  console.log('ok   warm surfaces');
}

if (changed) fs.writeFileSync('app/src/main/assets/styles.css', css);
console.log('changed blocks:', changed);
