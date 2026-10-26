import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function applyTrainingVisibility');
console.log(app.slice(i, i + 900).replace(/\s+/g,' '));
console.log('=== trends panel fn ===');
const j = app.indexOf("data-trends-panel");
console.log(app.slice(j - 500, j + 300).replace(/\s+/g,' ').slice(0, 700));
