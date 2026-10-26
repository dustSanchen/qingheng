import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/00-head.fragment.js','utf8');
const i = t.indexOf('function closeTerm');
console.log(JSON.stringify(t.slice(i-80, i+260)));
const j = t.indexOf('document.addEventListener("click"');
console.log('--- doc handler ---');
console.log(JSON.stringify(t.slice(j, j+380)));
