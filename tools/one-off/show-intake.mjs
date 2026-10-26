import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function intakeRangeForDate');
console.log(app.slice(i, i + 1200).replace(/\s+/g,' '));
console.log('=== goals in profile select ===');
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const j = html.indexOf('id="profile-goal"');
console.log(html.slice(j, j + 400).replace(/\s+/g,' '));
