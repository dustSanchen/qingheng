import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
const lines = t.split(/\r?\n/);
for (let i = 4578; i < 4596; i++) console.log((i+1) + '  ' + (lines[i]||'').trim().slice(0, 160));
