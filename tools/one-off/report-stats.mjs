import fs from 'node:fs';
const f = 'D:\\AI\\codex\\Anthropic-Claude_设计语言深度调研报告.md';
const t = fs.readFileSync(f, 'utf8');
console.log('chars:', t.length, '| lines:', t.split(/\r?\n/).length);
console.log('sections:', (t.match(/^## /gm) || []).length);
console.log('contrast rows:', (t.match(/on `#faf9f5`/g) || []).length);
for (const line of t.split(/\r?\n/)) if (/on `#faf9f5`/.test(line)) console.log(line.trim());
