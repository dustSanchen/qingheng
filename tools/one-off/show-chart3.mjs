import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('const weights = points.map(item => Number(item.weight));');
console.log(app.slice(i, i + 1800).replace(/\n/g, ' | ').slice(0, 1700));
