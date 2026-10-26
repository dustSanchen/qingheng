import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js','utf8');
for (const m of t.matchAll(/^.*library, if present.*$/gm)) console.log(JSON.stringify(m[0]));
