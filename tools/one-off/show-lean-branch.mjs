import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf("if (goal === 'lean') {");
console.log(app.slice(i, i + 2200).replace(/\s+/g,' ').slice(0, 2100));
