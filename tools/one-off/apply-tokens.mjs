import fs from 'node:fs';

const cssPath = 'D:/AI/health-android/app/src/main/assets/styles.css';
let css = fs.readFileSync(cssPath, 'utf8');
let nTokens = 0;
let nMerged = 0;

// ── 1) 补齐 02-tokens.md 里缺失的令牌（值取自文档）
const missing = {
  '--space-0': '2px',
  '--icon-xl': '28px',
  '--dur-slow': '.28s',
  '--dur-pulse': '1.6s',
  '--ease-out': 'cubic-bezier(.22,.8,.3,1)',
  '--ease-inout': 'ease-in-out',
  '--fw-regular': '400',
  '--fw-bold': '700',
  '--fw-display': '600',
  '--tracking-display': '-.01em',
  '--tracking-caps': '.12em',
  '--ring-focus-color-soft': '#a9c6b3',
  '--ring-select': '0 0 0 2px #44755d22',
  '--flash-ring': '0 0 0 3px #9dbb9b',
  '--accent-line': '#cfded2',
  '--accent-deep': '#2f5340'
};

const declared = name => new RegExp('(^|[{;\\s])' + name + ':', 'm').test(css);
const add = [];
for (const [name, value] of Object.entries(missing)) {
  if (declared(name)) continue;
  add.push(`${name}:${value};`);
  nTokens++;
}
if (add.length) {
  css += `\n/* 阶段 2 令牌补齐：图标 / 动效 / 字重字距 / 间距 / 焦点环 / 强调线 */\n:root{${add.join('')}}\n`;
}

// ── 2) 按 02-mapping.csv 归并硬编码色值（保留 .stats-good/.stats-bad 字面量）
const plan = JSON.parse(fs.readFileSync('D:/AI/health-android/build/mapping-plan.json', 'utf8'));
const keepLiteral = [/\.stats-good\{color:[^}]+\}/i, /\.stats-bad\{color:[^}]+\}/i];
for (const { value, target } of plan) {
  if (!declared(target) && !/^--(ok|accent|warn|danger)$/.test(target)) {
    // 目标 token 不存在就跳过，避免产出无效 var()
    const known = new RegExp('(^|[{;\\s])' + target + ':', 'm').test(css);
    if (!known) { continue; }
  }
  // 先保护 .stats-good/.stats-bad 里的字面量
  const guarded = [];
  let work = css;
  keepLiteral.forEach((re, i) => {
    work = work.replace(re, m => { guarded.push(m); return `\u0000GUARD${i}_${guarded.length - 1}\u0000`; });
  });
  const re = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const hits = (work.match(re) || []).length;
  if (!hits) { css = work.replace(/\u0000GUARD\d+_\d+\u0000/g, () => guarded.shift()); continue; }
  work = work.replace(re, `var(${target})`);
  // 还原守卫
  css = work.replace(/\u0000GUARD(\d+)_(\d+)\u0000/g, () => guarded.shift());
  nMerged += hits;
}

fs.writeFileSync(cssPath, css);
console.log('新增 token:', nTokens, '| 归并处数:', nMerged);
const hexLeft = (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
console.log('剩余 hex:', hexLeft);
