import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('class="chart-value"');
console.log(app.slice(Math.max(0, i - 700), i + 200));
