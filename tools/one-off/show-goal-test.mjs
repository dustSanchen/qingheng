import fs from 'node:fs';
const t = fs.readFileSync('tests/training-day-budget.test.mjs','utf8');
for (const l of t.split(/\r?\n/)) if (/薄肌 goal drives/.test(l)) console.log(l.trim());
