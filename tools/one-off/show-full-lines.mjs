import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
const lines = t.split(/\r?\n/);
console.log(lines[1473]);
console.log('----');
console.log(lines[1474]);
console.log('----');
console.log(lines[1475]);
