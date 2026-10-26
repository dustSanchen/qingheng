import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js','utf8');
const lines = t.split(/\r?\n/);
const i = lines.findIndex(l => /function renderDailyCheck/.test(l));
for (let k = i; k < i + 30; k++) console.log((k+1) + '  ' + (lines[k]||'').trim().slice(0, 170));
