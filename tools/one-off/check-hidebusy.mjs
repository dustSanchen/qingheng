import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
let i = -1, n = 0;
while ((i = app.indexOf('hideBusy()', i + 1)) > 0 && n < 8) { console.log(n, ':', app.slice(Math.max(0,i-90), i+20).replace(/\s+/g,' ')); n++; }
console.log('estimate-busy refs:', (app.match(/estimate-busy/g)||[]).length);
