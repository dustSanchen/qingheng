import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/00-head.fragment.js','utf8').split(/\r?\n/);
for (let i=543; i<556; i++) console.log((i+1) + '  ' + (t[i]||'').trim().slice(0,170));
