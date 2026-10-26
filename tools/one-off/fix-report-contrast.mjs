import fs from 'node:fs';
const f = 'D:\\AI\\codex\\Anthropic-Claude_设计语言深度调研报告.md';
let t = fs.readFileSync(f, 'utf8');
const fixes = [
  ['| `#141413` on `#faf9f5` | **16.4 : 1** |', '| `#141413` on `#faf9f5` | **17.50 : 1** |'],
  ['| `#3d3d3a` on `#faf9f5` | **9.9 : 1** |', '| `#3d3d3a` on `#faf9f5` | **10.34 : 1** |'],
  ['| `#5e5d59` on `#faf9f5` | **6.4 : 1** |', '| `#5e5d59` on `#faf9f5` | **6.26 : 1** |'],
  ['| `#87867f` on `#faf9f5` | **3.2 : 1** |', '| `#87867f` on `#faf9f5` | **3.47 : 1** |'],
  ['| clay `#d97757` on `#faf9f5` | **2.9 : 1** |', '| clay `#d97757` on `#faf9f5` | **2.96 : 1** |']
];
let n = 0;
for (const [from, to] of fixes) {
  if (t.includes(from)) { t = t.replace(from, to); n++; }
  else console.log('MISS:', from.slice(0, 40));
}
t = t.replace('> 本报告不复制', '> 对比度数值由 Node 按 WCAG 2.1 相对亮度公式逐项计算（2026-10-26 复算），未引用他人结论。\n>\n> 本报告不复制');
fs.writeFileSync(f, t);
console.log('corrected rows:', n);
