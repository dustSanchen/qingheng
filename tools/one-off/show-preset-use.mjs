import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('const preset = GOAL_PRESETS[goal]');
console.log(app.slice(i, i + 900).replace(/\s+/g,' '));
