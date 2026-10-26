import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/70-rest.fragment.js','utf8');
const i = t.indexOf("await api('/api/habits', {...(habitRowFor(activeDate)");
console.log(JSON.stringify(t.slice(i, i + 420)));
console.log('=== oilSpoons refs:', (t.match(/oilSpoons/g)||[]).length);
