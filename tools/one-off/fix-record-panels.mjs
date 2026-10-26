import fs from 'node:fs';
const f = 'app/src/fragments/70-rest.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const from = "headings: ['下周计划', '训练日志']";
const to = "headings: ['训练计划', '下周计划', '训练日志']";
if (!t.includes(from)) { console.log('anchor missing'); process.exit(1); }
fs.writeFileSync(f, t.replace(from, to));
console.log('record panel headings fixed');
