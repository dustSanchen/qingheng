import fs from 'node:fs';
const f='tests/lean-targets.test.mjs';
let lines=fs.readFileSync(f,'utf8').split('\n');
const i=lines.findIndex(l => l.includes("the hub summary uses the goal-aware range"));
if(i<0) throw new Error('line not found');
lines[i] = "check('the hub summary uses the goal-aware range', fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8').includes('const range = intakeRangeForDate();'));";
fs.writeFileSync(f, lines.join('\n'));
console.log('fixed line', i+1);
