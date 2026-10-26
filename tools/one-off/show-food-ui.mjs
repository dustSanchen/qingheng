import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const lines = app.split(/\r?\n/);
for (let i=515; i<575; i++) console.log((i+1) + '  ' + (lines[i]||'').trim().slice(0, 175));
