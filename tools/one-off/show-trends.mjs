import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function renderTrends');
console.log('--- renderTrends ---');
console.log(app.slice(i, i + 1600));
