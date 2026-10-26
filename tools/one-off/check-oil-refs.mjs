import fs from 'node:fs';
let t = fs.readFileSync('app/src/fragments/70-rest.fragment.js','utf8');
const refs = (t.match(/oilSpoons/g)||[]).length;
console.log('remaining oilSpoons refs:', refs);
t.split(/\r?\n/).filter(l => l.includes('oilSpoons')).forEach(l => console.log('  ' + l.trim().slice(0,120)));
