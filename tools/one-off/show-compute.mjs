import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function computeTargets');
console.log('computeTargets @', i);
console.log(app.slice(i, i + 1400).replace(/\s+/g,' ').slice(0, 1300));
