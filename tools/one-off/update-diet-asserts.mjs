import fs from 'node:fs';
let t = fs.readFileSync('tests/layout-four.test.mjs','utf8');
const from = "check('bars are relative to that day range', app.includes('intakeRangeForDate(day)') && app.includes('const span = range.max - range.min || 1;'));";
const to = "check('bars are a share of the upper bound', app.includes('intakeRangeForDate(day)') && app.includes('const percent = recorded ? Math.max(4, Math.min(100, Math.round((kcal / Math.max(range.max, 1)) * 100))) : 0;'));\ncheck('states are in / low / over / empty', app.includes(\"kcal > range.max ? 'over' : kcal < range.min ? 'low' : 'in'\"));\ncheck('values carry a unit', app.includes('`${kcal} kcal`'));\ncheck('a colour legend exists', app.includes('diet-key in') && app.includes('diet-key over'));";
if (!t.includes(from)) throw new Error('anchor missing');
fs.writeFileSync('tests/layout-four.test.mjs', t.replace(from, to));
console.log('assertions updated');
