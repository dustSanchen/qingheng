import fs from 'node:fs';
let t = fs.readFileSync('tests/habit-and-training-mode.test.mjs','utf8');
const from = "check('it re-runs on every render', /renderTrainingInsights\\(\\);\\r?\\n\\s*applyTrainingVisibility\\(\\);/.test(app));";
const to = "check('it re-runs on every render', /renderTrainingInsights\\(\\);[\\s\\S]{0,200}applyTrainingVisibility\\(\\);/.test(app));";
if (!t.includes(from)) throw new Error('anchor missing');
fs.writeFileSync('tests/habit-and-training-mode.test.mjs', t.replace(from, to));
console.log('assertion relaxed for the diet refresh call');
