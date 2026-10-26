import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js','utf8');
const lines = t.split(/\r?\n/);
const idx = lines.findIndex(l => l.includes("carbCap(p, range)"));
console.log('macro line:', idx + 1);
// 往上找 function 定义与 range 声明
for (let i = idx; i > idx - 90; i--) {
  const l = lines[i] || '';
  if (/^\s*(async )?function |const range|let range|range =/.test(l)) console.log((i+1) + '  ' + l.trim().slice(0, 140));
}
