import fs from 'node:fs';

// ── A. 去掉「AI 模板感」最强的英文小标题与营销副标题
let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const before = html.length;
const eyebrows = [...html.matchAll(/<p class="eyebrow">[^<]*<\/p>/g)];
html = html.replace(/<p class="eyebrow">[^<]*<\/p>/g, '');
const taglines = [...html.matchAll(/<\/h1><p class="muted">[^<]{1,40}<\/p>/g)];
html = html.replace(/<\/h1><p class="muted">[^<]{1,40}<\/p>/g, '</h1>');
fs.writeFileSync('app/src/main/assets/index.html', html);
console.log('去掉英文小标题:', eyebrows.length, '| 去掉营销副标题:', taglines.length, '| html', before, '->', html.length);

// ── B. 布局与卡片规则收拾干净
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
let n = 0;

// B1. 旧 .card 规则（22px 内边距 + 阴影）压回令牌值
const oldCard = '.card{background:var(--paper);border:1px solid var(--line);border-radius:22px;padding:22px;margin-bottom:18px;box-shadow:var(--shadow)}';
if (css.includes(oldCard)) {
  css = css.replace(oldCard, '.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:var(--card-pad);margin-bottom:var(--card-gap)}');
  n++; console.log('ok  归一 .card');
}

// B2. 手机端单列：两列网格在窄屏会把能量球挤掉
if (!css.includes('@media (max-width: 640px)')) {
  css += '\n' + [
    '/* 手机上不排两列：能量卡只有 60% 宽度时，150px 的能量球会被裁掉。 */',
    '@media (max-width: 640px){',
    '  .dashboard-grid{grid-template-columns:1fr;gap:var(--card-gap)}',
    '  .dashboard-grid > *{min-width:0}',
    '}',
    '',
    '/* 能量球：更小、可换行，永不被裁。 */',
    '.energy-body{flex-wrap:wrap;gap:var(--space-4)}',
    '.energy-ring{width:112px;height:112px;max-width:100%}',
    '.energy-ring>div{width:94px;height:94px}',
    '.energy-ring strong{font-size:26px}',
    '.energy-detail{flex:1 1 150px;min-width:0}'
  ].join('\n');
  n++; console.log('ok  手机单列 + 能量球缩小');
}
fs.writeFileSync('app/src/main/assets/styles.css', css);
console.log('css changed:', n);
