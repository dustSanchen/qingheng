import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const j = app.indexOf('const specs = [');
console.log(app.slice(j, j + 900));
console.log('=== trend-stats block ===');
const k = app.indexOf("trend-stats");
console.log(app.slice(Math.max(0,k-700), k+80));
