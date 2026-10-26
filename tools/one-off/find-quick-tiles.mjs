import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('记训练');
console.log('js:', app.slice(Math.max(0,i-300), i+80).replace(/\s+/g,' '));
