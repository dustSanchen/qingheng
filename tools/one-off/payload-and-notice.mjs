import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf("const payload={question");
if (i < 0) { const j = app.indexOf("question:"); console.log(app.slice(j-300, j+400).replace(/\s+/g,' ')); }
else console.log(app.slice(i, i + 600).replace(/\s+/g,' '));
const n = app.indexOf('function notice');
console.log('notice idx', n);
if (n > 0) console.log(app.slice(n, n + 300).replace(/\s+/g,' '));
