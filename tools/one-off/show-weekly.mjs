import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const re of ['weeklyKg','kgPerWeek','weeklyChange','expectedWeekly','0.27']) {
  const hits = [...app.matchAll(new RegExp(re, 'g'))].length;
  console.log(re, '=>', hits);
}
const i = app.indexOf('weeklyAverage');
console.log(app.slice(Math.max(0,i-400), i+200).replace(/\s+/g,' '));
