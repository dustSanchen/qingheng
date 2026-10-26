import fs from 'node:fs';
const lines = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js','utf8').split(/\r?\n/);
for (let k = 248; k < 300; k++) console.log((k+1) + '  ' + (lines[k]||'').trim().slice(0, 160));
