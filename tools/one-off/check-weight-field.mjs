import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('训练日志');
const seg = html.slice(i, i + 900).replace(/\s+/g,' ');
console.log(seg.slice(0, 780));
console.log('--- volume ---');
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const j = app.indexOf('function exerciseVolume');
console.log(app.slice(j, j + 320));
