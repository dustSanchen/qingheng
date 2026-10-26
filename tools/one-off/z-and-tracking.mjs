import fs from 'node:fs';

const p = 'D:/AI/health-android/app/src/main/assets/styles.css';
let css = fs.readFileSync(p, 'utf8');
const before = css;
let nZ = 0, nLs = 0;

// ── ① z-index 统一刻度（审计 #1：底栏压住内容、弹层层级混乱）
if (!css.includes('--z-tabbar')) {
  css += [
    '',
    '/* 层级刻度：一处定义，所有固定层引用。数值间隔足够，避免同层竞争。 */',
    ':root{--z-sticky:8;--z-tabbar:60;--z-overlay:80;--z-dialog:90;--z-sheet:120;--z-toast:180;--z-busy:200}',
    '.tab-bar{position:fixed;left:0;right:0;bottom:0;z-index:var(--z-tabbar)}',
    '.sheet{position:fixed;inset:0;z-index:var(--z-overlay)}',
    '.app-dialog{position:fixed;inset:0;z-index:var(--z-dialog)}',
    '.term-sheet{position:fixed;inset:0;z-index:var(--z-sheet)}',
    '#global-notice{position:fixed;left:12px;right:12px;z-index:var(--z-toast)}',
    '.busy-layer{position:fixed;inset:0;z-index:var(--z-busy)}',
    /* 底栏之上的内容永远可滚到：给所有滚动容器留出底栏高度。 */',
    'html{scroll-padding-bottom:calc(var(--tabbar-safe,96px) + 16px)}'
  ].join('\n') + '\n';
  nZ++;
}

// ── ② 字距系统化：把散落字面量收进 --tracking-*
const lsMap = [
  [/letter-spacing:\s*3px/g, 'letter-spacing:var(--tracking-caps)'],
  [/letter-spacing:\s*2\.1px/g, 'letter-spacing:var(--tracking-caps)'],
  [/letter-spacing:\s*2px/g, 'letter-spacing:var(--tracking-caps)'],
  [/letter-spacing:\s*1\.5px/g, 'letter-spacing:var(--tracking-label)'],
  [/letter-spacing:\s*\.5px/g, 'letter-spacing:var(--tracking-label)'],
  [/letter-spacing:\s*\.3px/g, 'letter-spacing:var(--tracking-label)'],
  [/letter-spacing:\s*\.2px/g, 'letter-spacing:var(--tracking-label)'],
  [/letter-spacing:\s*\.1px/g, 'letter-spacing:var(--tracking-label)'],
  [/letter-spacing:\s*-\.2px/g, 'letter-spacing:var(--tracking-display)'],
  [/letter-spacing:\s*-\.1px/g, 'letter-spacing:var(--tracking-display)'],
  [/letter-spacing:\s*-\.005em/g, 'letter-spacing:var(--tracking-display)'],
  [/letter-spacing:\s*\.01em/g, 'letter-spacing:var(--tracking-label)'],
  [/letter-spacing:\s*\.02em/g, 'letter-spacing:var(--tracking-label)']
];
for (const [re, to] of lsMap) {
  const hits = (css.match(re) || []).length;
  if (hits) { css = css.replace(re, to); nLs += hits; }
}
// 标题统一字距
if (!css.includes('.t-page{')) { /* 已有类型类，跳过 */ }

fs.writeFileSync(p, css);
const lit = (css.match(/letter-spacing:\s*(?!var\()[^;}]+/g) || []).length;
console.log('z-index 块:', nZ, '| 字距替换:', nLs, '| 字距字面量残留:', lit);
console.log('tab-bar 规则存在:', css.includes('.tab-bar{position:fixed'));
