import fs from 'node:fs';
const a = fs.readFileSync('tests/habit-and-training-mode.test.mjs','utf8');
for (const l of a.split(/\r?\n/)) if (/re-runs on every render/.test(l)) console.log('HABIT: ' + l.trim());
const b = fs.readFileSync('tests/meal-date-context.test.mjs','utf8');
for (const l of b.split(/\r?\n/)) if (/chat filter really filters/.test(l)) console.log('CHAT: ' + l.trim());
