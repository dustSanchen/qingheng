import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
const lines = t.split(/\r?\n/);
console.log('--- around 4160-4200 (manual meal save) ---');
for (let i=4155; i<4200; i++) console.log((i+1) + '  ' + (lines[i]||'').trim().slice(0,150));
