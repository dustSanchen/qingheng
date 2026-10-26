import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js','utf8');
const lines = t.split(/\r?\n/);
for (let i=124; i<136; i++) console.log((i+1) + '  ' + (lines[i]||'').trim().slice(0,180));
console.log('--- 688 box (quick record) ---');
const s = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js','utf8').split(/\r?\n/);
for (let i=686; i<700; i++) console.log((i+1) + '  ' + (s[i]||'').trim().slice(0,180));
