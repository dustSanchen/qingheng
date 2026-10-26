import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf("$('#trend-stats').innerHTML");
console.log(app.slice(i, i + 1100));
console.log('=== statsTableHtml ===');
const j = app.indexOf('function statsTableHtml');
console.log(app.slice(j, j + 800));
