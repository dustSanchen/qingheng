import fs from 'node:fs';
const lines = fs.readFileSync('tests/layout-four.test.mjs','utf8').split(/\r?\n/);
lines.forEach((line, i) => { if (line.includes('renderDietTrend')) console.log((i+1) + ': ' + line); });
