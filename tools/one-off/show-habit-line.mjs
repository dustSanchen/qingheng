import fs from 'node:fs';
const lines = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js','utf8').split(/\r?\n/);
const idx = lines.findIndex(l => l.includes("habit-summary"));
console.log('line', idx + 1);
console.log(JSON.stringify(lines[idx]));
