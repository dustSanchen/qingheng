import fs from 'node:fs';
const t = fs.readFileSync('tests/training-library.test.mjs','utf8');
for (const line of t.split(/\r?\n/)) if (line.includes('the plan carries reasons') || line.includes('generator uses the day templates') || line.includes('priority order is declared')) console.log(line.trim().slice(0, 220));
