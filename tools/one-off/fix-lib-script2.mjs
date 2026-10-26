import fs from 'node:fs';
let t = fs.readFileSync('tools/one-off/training-library.mjs','utf8');
const from = '  <script src="./app.js" defer></script>';
const to = '  <script src="./training-principles.js" defer></script>\n  <script src="./app.js" defer></script>';
if (!t.includes(from)) throw new Error('anchor missing');
fs.writeFileSync('tools/one-off/training-library.mjs', t.replace(from, to));
console.log('script anchor simplified');
