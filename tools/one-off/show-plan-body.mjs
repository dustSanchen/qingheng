import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function renderWeekPlan');
console.log(app.slice(i, i + 2600).replace(/\n\s*/g, ' | ').slice(0, 2400));
