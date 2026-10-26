import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
const lines = t.split(/\r?\n/);
const hits = [];
lines.forEach((line, i) => { if (/data-meal-field|mealForm|saveMeal|carbs/i.test(line)) hits.push((i+1) + '  ' + line.trim().slice(0, 150)); });
console.log('hits:', hits.length);
for (const h of hits.slice(0, 45)) console.log(h);
