import fs from 'node:fs';
const p = 'docs/design/09-codex-handoff.md';
let t = fs.readFileSync(p, 'utf8');
t = t.replace('令牌 103 个；`var()` 引用 773+ 处', '令牌 111 个；`var()` 引用 773+ 处');
t = t.replace('全部样式与令牌（939 行）', '全部样式与令牌（960 行）');
fs.writeFileSync(p, t);
console.log('校正后:', /令牌 111 个/.test(t), /960 行/.test(t));
