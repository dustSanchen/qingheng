import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function renderAiPlan');
const seg = app.slice(i, i + 2600);
const k = seg.indexOf('ai-plan-row');
console.log(seg.slice(Math.max(0,k-700), k+900).replace(/\n\s*/g,' | ').slice(0,1500));
