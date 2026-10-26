import fs from 'node:fs';
const t = fs.readFileSync('D:\\AI\\codex\\轻衡_设计迭代日志.md','utf8');
const lines = t.split(/\r?\n/);
console.log('lines:', lines.length);
console.log(lines.slice(-24).join('\n'));
