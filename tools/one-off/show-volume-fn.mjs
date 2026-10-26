import fs from 'node:fs';
const app = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js','utf8');
const i = app.indexOf('function renderVolumeTable');
console.log(app.slice(i, i + 900));
