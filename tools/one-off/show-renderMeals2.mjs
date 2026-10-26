import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function renderMeals');
console.log(app.slice(i + 900, i + 1500));
console.log('--- call site ---');
const j = app.indexOf("renderMeals($('#record-meals')");
console.log(app.slice(j - 120, j + 200));
