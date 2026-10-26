import fs from 'node:fs';
const f = 'D:\\AI\\codex\\Anthropic-Claude_设计语言深度调研报告.md';
const t = fs.readFileSync(f, 'utf8');
console.log('chars:', t.length, '| lines:', t.split(/\r?\n/).length, '| sections:', (t.match(/^## /gm) || []).length);
console.log('--- section list ---');
for (const m of t.matchAll(/^## (.+)$/gm)) console.log('  ' + m[1]);
console.log('--- A-level mentions:', (t.match(/A 级/g) || []).length);
console.log('--- 404 mentioned:', t.includes('404'));
