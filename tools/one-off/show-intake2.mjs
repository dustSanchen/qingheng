import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function intakeRangeForDate');
console.log(app.slice(i + 700, i + 1500));
console.log('=== computeTargets return ===');
const j = app.indexOf('return {tdee, bmr');
console.log(j > 0 ? app.slice(j, j + 420) : 'not found');
const k = app.indexOf('weeklyAverage,');
console.log(app.slice(Math.max(0,k-120), k+300).replace(/\s+/g,' '));
