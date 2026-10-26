import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/70-rest.fragment.js','utf8');
for (const line of t.split(/\r?\n/)) if (line.includes('switchTab(restoreTab())')) console.log(JSON.stringify(line.slice(0,120)));
