import fs from 'node:fs';
let t = fs.readFileSync('tests/layout-four.test.mjs','utf8');
const from = "check('bars are a share of the upper bound', app.includes('intakeRangeForDate(day)') && app.includes('const percent = recorded ? Math.max(4, Math.min(100, Math.round((kcal / Math.max(range.max, 1)) * 100))) : 0;'));";
const to = "check('bars are a share of the upper bound', app.includes('intakeRangeForDate(day)') && app.includes('Math.round((kcal / scaleMax) * 100)'));";
if (!t.includes(from)) throw new Error('anchor missing');
fs.writeFileSync('tests/layout-four.test.mjs', t.replace(from, to));
console.log('assertion updated for the banded scale');
