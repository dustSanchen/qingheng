import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/70-rest.fragment.js','utf8');
const lines = t.split(/\r?\n/);
lines.forEach((l,i) => { if (/renderLastChat|上次问答/.test(l)) console.log((i+1) + '  ' + JSON.stringify(l.slice(0,90))); });
