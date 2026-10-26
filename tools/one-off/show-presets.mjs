import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('GOAL_PRESETS');
console.log(app.slice(i - 200, i + 1400).replace(/\s+/g,' ').slice(0, 1500));
