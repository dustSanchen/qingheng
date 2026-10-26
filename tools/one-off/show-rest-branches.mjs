import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/70-rest.fragment.js','utf8').split(/\r?\n/);
for (let i=760; i<792; i++) console.log((i+1) + '  ' + (t[i]||'').trim().slice(0,170));
