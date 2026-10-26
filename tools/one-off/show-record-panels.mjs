import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('RECORD_PANELS');
console.log(app.slice(i - 300, i + 1500).replace(/\s+/g,' ').slice(0, 1500));
