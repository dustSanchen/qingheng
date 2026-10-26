import fs from 'node:fs';

const cssPath = 'D:/AI/health-android/app/src/main/assets/styles.css';
let css = fs.readFileSync('D:/AI/health-android/build/styles.before-tokens.css', 'utf8'); // 回滚后再来
let nTokens = 0, nMerged = 0;

// ── 1) 补齐缺失令牌
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
if (add.length) css += `\n/* 阶段 2 令牌补齐（图标/动效/字重字距/间距/焦点环/强调线） */\n:root{${add.join('')}}\n`;

// ── 2) 归并硬编码：只在完整色值边界上替换，避免把 8 位 alpha 色切坏
const plan = JSON.parse(fs.readFileSync('D:/AI/health-android/build/mapping-plan.json', 'utf8'));
const protectedRules = /\.stats-(good|bad)\{[^}]*\}/g;

for (const { value, target } of plan) {
  if (!declared(target)) continue;                        // 目标 token 必须存在
  const guards = [];
  css = css.replace(protectedRules, m => { guards.push(m); return `\u0000P${guards.length - 1}\u0000`; });

  const esc = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 前后都不能再接 16 进制字符，防止 #e6dfd880 被当成 #e6dfd8
  const re = new RegExp('(?<![0-9a-fA-F])' + esc + '(?![0-9a-fA-F])', 'gi');
  const hits = (css.match(re) || []).length;
  if (hits) { css = css.replace(re, `var(${target})`); nMerged += hits; }

  css = css.replace(/\u0000P(\d+)\u0000/g, (_, i) => guards[Number(i)]);
}

fs.writeFileSync(cssPath, css);
const hexLeft = (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
console.log('新增 token:', nTokens, '| 归并处数:', nMerged, '| 剩余 hex:', hexLeft);
console.log('stats 字面量保留:', /\.stats-good\{color:#3f7a5e\}/.test(css));
