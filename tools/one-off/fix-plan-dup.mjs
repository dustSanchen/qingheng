import fs from 'node:fs';

const f = 'app/src/fragments/60-training-copy.fragment.js';
let t = fs.readFileSync(f, 'utf8');

// 旧的一行 thisWeekHtml 还残留着（新块以 let thisWeekHtml 开始，旧行重复声明）
const dup = '    const thisWeekHtml = "<h3 class=\\"plan-sub\\">本周安排 · " + esc(weekStart.slice(5)) + " 起</h3><ul class=\\"plan-week\\">" + weekRows.join("") + "</ul>";';
const i = t.indexOf(dup);
if (i >= 0) { t = t.slice(0, i) + t.slice(i + dup.length + 1); console.log('removed the stale thisWeekHtml line'); }
else console.log('stale line not found');

// 如果还残留 weekRows 构造（旧的七天循环），一并清掉
const oldLoop = t.indexOf('    const weekRows = [];');
if (oldLoop >= 0) console.log('warning: weekRows block still present at', oldLoop);

fs.writeFileSync(f, t);
console.log('thisWeekHtml declarations:', (t.match(/thisWeekHtml/g) || []).length);
