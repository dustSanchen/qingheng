import fs from 'node:fs';

const f = 'app/src/fragments/60-training-copy.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const start = t.indexOf('    // 本周已经练了什么');
if (start < 0) { console.log('this-week block not found (already reverted)'); process.exit(0); }
const endMarker = "    box.innerHTML = annotateTerms(thisWeekHtml + cueHtml";
const end = t.indexOf(endMarker);
if (end < 0) throw new Error('assignment marker missing');
// 回退到原来的写法：去掉本周块 + 去掉 thisWeekHtml 前缀
t = t.slice(0, start) + t.slice(end).replace('annotateTerms(thisWeekHtml + cueHtml', 'annotateTerms(cueHtml');
fs.writeFileSync(f, t);
console.log('this-week block reverted');
