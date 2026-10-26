import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const idx = [];
let i = -1;
while ((i = app.indexOf('权限', i + 1)) > 0) idx.push(i);
console.log('权限出现次数:', idx.length);
for (const j of idx.slice(0, 6)) console.log('...', app.slice(Math.max(0,j-90), j+70).replace(/\s+/g,' '));
const k = app.indexOf('载入失败');
console.log('载入失败:', k > 0 ? app.slice(k-120, k+80).replace(/\s+/g,' ') : 'none');
