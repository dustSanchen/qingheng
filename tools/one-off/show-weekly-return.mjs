import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/40-targets.fragment.js','utf8');
const i = t.indexOf('weeklyAverage,');
console.log(JSON.stringify(t.slice(Math.max(0,i-260), i+200)));
