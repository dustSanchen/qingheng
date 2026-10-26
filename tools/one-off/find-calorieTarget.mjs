import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
const lines = t.split(/\r?\n/);
lines.forEach((line, i) => { if (/calorieTarget/.test(line)) console.log((i+1) + '  ' + line.trim().slice(0, 160)); });
