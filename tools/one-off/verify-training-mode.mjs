import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
console.log('week-plan-card in hide list:', app.includes("'week-plan-card'"));
console.log('training-advice-order in list:', app.includes("'training-advice-order'"));
console.log('fallback switches:', app.includes('data-records-panel].active'));
const i = app.indexOf('function applyTrainingVisibility');
console.log(app.slice(i, i + 1100).replace(/\s+/g,' ').slice(0, 900));
