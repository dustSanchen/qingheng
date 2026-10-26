import fs from 'node:fs';
const src = fs.readFileSync('tools/one-off/training-library.mjs','utf8').split(/\r?\n/);
let depth = 0;
for (let i = 0; i < src.length; i++) {
  const line = src[i];
  if (i >= 20 && i <= 115) {
    for (const ch of line) {
      if (ch === '[') depth++;
      if (ch === ']') depth--;
    }
    if (depth < 0) { console.log('depth negative at line', i + 1, ':', line.slice(0, 120)); break; }
  }
}
console.log('final depth between 20..115:', depth);
