import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = t.indexOf('function empty(');
console.log(t.slice(Math.max(0, i - 120), i + 420));
