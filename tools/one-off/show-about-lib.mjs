import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/70-rest.fragment.js','utf8');
const i = t.indexOf('建议库');
console.log(t.slice(Math.max(0, i - 600), i + 400));
