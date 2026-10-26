import fs from 'node:fs';
const file='tests/chat-quality.test.mjs';
let lines=fs.readFileSync(file,'utf8').split('\n');
const idx = lines.findIndex(l => l.includes("the page hides a null-only answer"));
if (idx < 0) throw new Error('assertion not found');
lines[idx] = "check('the page hides a null-only answer', app.includes('null){3,}/i.test(raw)'));";
fs.writeFileSync(file, lines.join('\n'));
console.log('rewrote:', lines[idx]);
