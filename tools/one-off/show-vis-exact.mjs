import fs from 'node:fs';
const f = 'app/src/fragments/10-rich-answer.fragment.js';
const t = fs.readFileSync(f, 'utf8');
const i = t.indexOf('function applyTrainingVisibility');
console.log(JSON.stringify(t.slice(i, i + 420)));
