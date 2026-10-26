import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
let i = -1, n = 0;
while ((i = app.indexOf('markFieldInvalid', i + 1)) > 0 && n < 4) {
  console.log('---', n, ':', app.slice(Math.max(0, i - 220), i + 160).replace(/\s+/g, ' '));
  n++;
}
