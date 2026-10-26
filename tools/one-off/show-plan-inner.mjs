import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js','utf8');
const lines = t.split(/\r?\n/);
const i = lines.findIndex(l => /box\.innerHTML = '<p class="plan-today">/.test(l));
for (let k = i; k < i + 22; k++) console.log((k+1) + '  ' + (lines[k]||'').slice(0,150));
