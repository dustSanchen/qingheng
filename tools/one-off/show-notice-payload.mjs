import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function notice(');
console.log('notice:', app.slice(i, i + 500).replace(/\s+/g,' '));
const j = app.indexOf('const payload={');
console.log('payload:', app.slice(j, j + 520).replace(/\s+/g,' '));
