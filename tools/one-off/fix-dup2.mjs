import fs from 'node:fs';
const file='tests/chat-quality.test.mjs';
const lines=fs.readFileSync(file,'utf8').split('\n');
// Keep the first declaration, drop the second (line 69, index 68).
lines.splice(68,1);
fs.writeFileSync(file, lines.join('\n'));
console.log('removed duplicate declaration');
