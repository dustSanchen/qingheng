import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function renderAiPlan');
console.log(app.slice(i, i + 900).replace(/\n\s*/g,' | ').slice(0, 900));
const j = app.indexOf('function installAiPlan');
console.log('--- install ---');
console.log(app.slice(j, j + 700).replace(/\n\s*/g,' | ').slice(0, 700));
