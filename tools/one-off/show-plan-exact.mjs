import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/00-head.fragment.js','utf8');
const i = t.indexOf('const plan = profile.goal');
console.log(JSON.stringify(t.slice(i, i + 320)));
