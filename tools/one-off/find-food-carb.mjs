import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const lines = app.split(/\r?\n/);
console.log('--- food related lines ---');
lines.forEach((line, i) => { if (/food/i.test(line) && /(carb|protein|fat|macro|map)|\/api\/food/.test(line)) console.log((i+1) + '  ' + line.trim().slice(0, 170)); });
