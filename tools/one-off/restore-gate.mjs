import fs from 'node:fs';
const f = 'app/src/fragments/40-targets.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const from = "if (goal !== 'lean' && !customRanges) {";
const to = "if (goal !== 'lean' && input.applyGoalPresets === true && !customRanges) {";
if (t.includes(from)) { t = t.replace(from, to); fs.writeFileSync(f, t); console.log('gate restored to 1.1.17 form'); } else console.log('anchor missing');
