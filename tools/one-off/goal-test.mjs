import fs from 'node:fs';

const f = 'tests/training-day-budget.test.mjs';
let t = fs.readFileSync(f, 'utf8');
const from = "check('the 薄肌 goal drives the daily range', app.includes(\"profile.goal === 'lean'\") && app.includes('薄肌计划（按维持'));";
const to = "check('every diet goal drives the daily range', app.includes(\"goal: profile.goal || 'recomp'\") && app.includes('goalLabel(profile.goal)'));";
if (t.includes(from)) { t = t.replace(from, to); fs.writeFileSync(f, t); console.log('assertion updated'); }
else console.log('assertion not found');
