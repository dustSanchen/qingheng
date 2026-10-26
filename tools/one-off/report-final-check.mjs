import fs from 'node:fs';
const f = 'D:\\AI\\codex\\Anthropic-Claude_设计语言深度调研报告.md';
const t = fs.readFileSync(f, 'utf8');
console.log('chars:', t.length, '| lines:', t.split(/\r?\n/).length, '| sections:', (t.match(/^## /gm) || []).length);
for (const m of t.matchAll(/^## (.+)$/gm)) console.log('  ' + m[1]);
console.log('--- 关键锚点 ---');
for (const k of ['默认制服', '看起来对', 'Claude Design', '404', '17.50', '100 HTML Files']) console.log((t.includes(k) ? 'ok  ' : 'MISS') + ' ' + k);
