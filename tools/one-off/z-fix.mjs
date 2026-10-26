import fs from 'node:fs';

const p = 'D:/AI/health-android/app/src/main/assets/styles.css';
let css = fs.readFileSync(p, 'utf8');
let n = 0;

// 1) 去掉我写错的死规则 .tab-bar（项目里没有这个类），改为引用真实的 .bottom-nav
css = css.replace(/\.tab-bar\{position:fixed;left:0;right:0;bottom:0;z-index:var\(--z-tabbar\)\}\n?/, '');
if (css.includes('.bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:20;')) {
  css = css.replace('.bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:20;', '.bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:var(--z-tabbar);');
  n++;
}

// 2) 其余固定层的 z-index 字面量改为引用刻度（就地替换，避免重复声明）
const map = {
  '.sheet{position:fixed;inset:0;z-index:80;': '.sheet{position:fixed;inset:0;z-index:var(--z-overlay);',
  '.app-dialog{position:fixed;inset:0;z-index:90;': '.app-dialog{position:fixed;inset:0;z-index:var(--z-dialog);',
  '.term-sheet{position:fixed;inset:0;z-index:120;': '.term-sheet{position:fixed;inset:0;z-index:var(--z-sheet);'
};
for (const [from, to] of Object.entries(map)) {
  if (css.includes(from)) { css = css.replace(from, to); n++; }
}

// 3) 去掉与新刻度重复的追加声明（只保留 :root 刻度 + scroll-padding）
css = css.split('\n').filter(line => {
  const l = line.trim();
  if (l === '.sheet{position:fixed;inset:0;z-index:var(--z-overlay)}') return false;
  if (l === '.app-dialog{position:fixed;inset:0;z-index:var(--z-dialog)}') return false;
  if (l === '.term-sheet{position:fixed;inset:0;z-index:var(--z-sheet)}') return false;
  if (l === '#global-notice{position:fixed;left:12px;right:12px;z-index:var(--z-toast)}') return false;
  if (l === '.busy-layer{position:fixed;inset:0;z-index:var(--z-busy)}') return false;
  return true;
}).join('\n');

// 4) 保留/补回必要的两条：提示条与等待层只改层级，不改其他属性
if (!css.includes('--z-toast')) throw new Error('z 刻度丢失');
css = css.replace('#global-notice{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));margin:0;z-index:180;',
  '#global-notice{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));margin:0;z-index:var(--z-toast);');
css = css.replace('.busy-layer{position:fixed;inset:0;z-index:200;', '.busy-layer{position:fixed;inset:0;z-index:var(--z-busy);');

fs.writeFileSync(p, css);
const dead = css.includes('.tab-bar{');
const lit = [...css.matchAll(/z-index:\s*(\d+)/g)].map(m => m[1]);
console.log('替换:', n, '| .tab-bar 死规则:', dead, '| 剩余数字 z-index:', [...new Set(lit)].join(' '));
console.log('var z-index 使用:', (css.match(/z-index:var\(--z-/g) || []).length);
