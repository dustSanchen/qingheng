import fs from 'node:fs';
const p = 'docs/design/10-codex-prompt.md';
const t = fs.readFileSync(p, 'utf8');
console.log('lines:', t.split(/\r?\n/).length, '| chars:', t.length);
// 自检：文档里引用的文件是否都存在
const refs = [...t.matchAll(/`(docs\/design\/[^`]+|app\/src\/[^`]+|tools\/[^`]+)`/g)].map(m=>m[1]);
const uniq = [...new Set(refs)];
const missing = uniq.filter(r => !fs.existsSync(r));
console.log('引用文件数:', uniq.length, '| 不存在:', missing.length, missing.slice(0,5).join(' '));
