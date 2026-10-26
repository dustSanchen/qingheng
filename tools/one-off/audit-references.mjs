/**
 * 整体体检：找出"引用了不存在的东西"这一类会静默卡死页面的 bug。
 *  1. app.js 里 $( '#id' ) / getElementById 引用的 id 是否真的存在；
 *  2. 调用的函数是否在同一份产物里有声明（或属于已知浏览器内置）。
 */
import fs from 'node:fs';

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

let problems = 0;
const report = (label, items) => {
  if (!items.length) return;
  problems += items.length;
  console.log(`\n== ${label} (${items.length})`);
  for (const item of items.slice(0, 40)) console.log('   ' + item);
};

// ---------------------------------------------------------------- ids --------------------------------
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const referenced = new Set();
for (const m of app.matchAll(/\$\('#([a-zA-Z0-9_-]+)'\)/g)) referenced.add(m[1]);
for (const m of app.matchAll(/getElementById\('([a-zA-Z0-9_-]+)'\)/g)) referenced.add(m[1]);
for (const m of app.matchAll(/querySelector\('#([a-zA-Z0-9_-]+)'\)/g)) referenced.add(m[1]);
const missingIds = [...referenced].filter(id => !htmlIds.has(id)).sort();
report('引用了不存在的 id', missingIds.map(id => `#${id}`));

// ---------------------------------------------------------------- functions ---------------------------
const declared = new Set();
for (const m of app.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) declared.add(m[1]);
for (const m of app.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g)) declared.add(m[1]);
for (const m of app.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*function/g)) declared.add(m[1]);

const KNOWN = new Set([
  // language + platform
  'if','for','while','switch','catch','return','typeof','function','new','await','async','of','in','do','else','try',
  'Number','String','Boolean','Array','Object','Math','JSON','Date','Promise','Map','Set','Error','RegExp','Intl','isNaN',
  'parseInt','parseFloat','isFinite','encodeURIComponent','decodeURIComponent','setTimeout','clearTimeout','setInterval',
  'clearInterval','requestAnimationFrame','fetch','alert','confirm','prompt','structuredClone','queueMicrotask',
  'URLSearchParams','Blob','File','FileReader','Image','FormData','TextEncoder','TextDecoder','AbortController','crypto',
  'localStorage','sessionStorage','document','window','console','navigator','location','history','CustomEvent','Event',
  // dom helpers defined through window.* or destructuring
  'querySelector','querySelectorAll','addEventListener','removeEventListener','dispatchEvent','closest','matches',
]);

const called = new Map();
for (const m of app.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
  const name = m[1];
  if (KNOWN.has(name)) continue;
  called.set(name, (called.get(name) || 0) + 1);
}
const undefinedCalls = [...called.entries()]
  .filter(([name]) => !declared.has(name) && !app.includes(`window.${name}`) && !app.includes(`${name} =`))
  .sort((a, b) => b[1] - a[1])
  .map(([name, n]) => `${name}()  ×${n}`);
report('调用了未声明的函数', undefinedCalls);

// ---------------------------------------------------------------- duplicates -------------------------
const idList = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const dupIds = idList.filter((id, i) => idList.indexOf(id) !== i);
report('重复的 id', [...new Set(dupIds)]);

// ---------------------------------------------------------------- summary ----------------------------
console.log(`\nids: html=${htmlIds.size} referenced=${referenced.size} functions=${declared.size} called=${called.size}`);
console.log(problems ? `\n发现 ${problems} 个问题` : '\n没有发现"引用不存在"类问题');
process.exitCode = problems ? 1 : 0;
