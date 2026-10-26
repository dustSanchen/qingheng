import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('记训练');
console.log('markup:', html.slice(i-320, i+40).replace(/\s+/g,' '));
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
console.log('data-records-panel training refs:', (app.match(/recordsPanel === 'training'|records-panel.*training/g)||[]).length);
