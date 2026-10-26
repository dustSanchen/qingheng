import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js','utf8');
const lines = t.split(/\r?\n/);
lines.forEach((l,i) => { if (/plan-today|suggestedNote|box\.innerHTML/.test(l)) console.log((i+1) + '  ' + l.trim().slice(0,120)); });
