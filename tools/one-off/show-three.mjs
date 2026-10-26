import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js','utf8');
const i = t.indexOf('function renderDailyThree');
console.log(t.slice(i, i + 1800));
console.log('=== daily-three-form submit ===');
const j = t.indexOf('daily-three-form');
console.log(t.slice(Math.max(0, j - 200), j + 300));
