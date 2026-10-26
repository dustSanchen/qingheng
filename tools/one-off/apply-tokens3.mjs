import fs from 'node:fs';

const cssPath = 'D:/AI/health-android/app/src/main/assets/styles.css';
let css = fs.readFileSync('D:/AI/health-android/build/styles.before-tokens.css', 'utf8');
let nTokens = 0, nMerged = 0;

// ── 1) 补齐缺失令牌
const missing = {
  '--space-0': '2px', '--icon-xl': '28px', '--dur-slow': '.28s', '--dur-pulse': '1.6s',
  '--ease-out': 'cubic-bezier(.22,.8,.3,1)', '--ease-inout': 'ease-in-out',
  '--fw-regular': '400', '--fw-bold': '700', '--fw-display': '600',
  '--tracking-display': '-.01em', '--tracking-caps': '.12em',
  '--ring-focus-color-soft': '#a9c6b3', '--ring-select': '0 0 0 2px #44755d22',
  '--flash-ring': '0 0 0 3px #9dbb9b', '--accent-line': '#cfded2', '--accent-deep': '#2f5340'
};
const declared = name => new RegExp('(^|[{;\\s])' + name + ':', 'm').test(css);
const add = [];
for (const [name, value] of Object.entries(missing)) {
  if (declared(name)) continue;
  add.push(`${name}:${value};`);
  nTokens++;
}
if (add.length) css += `\n/* 阶段 2 令牌补齐（图标/动效/字重字距/间距/焦点环/强调线） */\n:root{${add.join('')}}\n`;

// ── 2) 归并：先保护「令牌声明」与 .stats-* 规则，再替换，最后还原
const plan = JSON.parse(fs.readFileSync('D:/AI/health-android/build/mapping-plan.json', 'utf8'));
const guards = [];
const guard = (re) => { css = css.replace(re, m => { guards.push(m); return `\u0000G${guards.length - 1}\u0000`; }); };

guard(/(^|[{;\s])(--[a-z0-9-]+)\s*:\s*[^;}]+;?/g);   // 所有令牌声明
guard(/\.stats-(good|bad)\{[^}]*\}/g);                   // 方向色保持字面量

for (const { value, target } of plan) {
  if (!declared(target)) continue;
  const esc = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(?<![0-9a-fA-F])' + esc + '(?![0-9a-fA-F])', 'gi');
  const hits = (css.match(re) || []).length;
  if (hits) { css = css.replace(re, `var(${target})`); nMerged += hits; }
}

css = css.replace(/\u0000G(\d+)\u0000/g, (_, i) => guards[Number(i)]);
fs.writeFileSync(cssPath, css);

// ── 3) 自检：不允许自引用、不允许未声明 var
const selfRef = [...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/g)].filter(m => {
  const name = m[1];
  return [...m[2].matchAll(/var\((--[a-z0-9-]+)/g)].some(r => r[1] === name);
});
const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map(m => m[1]));
const decl = new Set([...css.matchAll(/(^|[{;\s])(--[a-z0-9-]+):/gm)].map(m => m[2]));
const undef = [...used].filter(t => !decl.has(t));
console.log('新增 token:', nTokens, '| 归并处数:', nMerged);
console.log('自引用:', selfRef.length, '| 未声明 var:', undef.length, undef.slice(0, 6).join(' '));
console.log('剩余 hex:', (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length);
