import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('applyTrainingVisibility();');
console.log(JSON.stringify(app.slice(i-90, i+30)));
