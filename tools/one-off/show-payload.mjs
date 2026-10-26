import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js','utf8');
const i = t.indexOf('const payload');
console.log(t.slice(i, i + 700));
console.log('=== feedback after success ===');
const j = t.indexOf("feedback(message, data?.webSearch");
console.log(t.slice(Math.max(0, j - 120), j + 260));
