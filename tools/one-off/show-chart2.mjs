import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('weight-chart');
console.log(app.slice(Math.max(0,i-200), i + 1200).replace(/\n/g,' | ').slice(0, 1300));
