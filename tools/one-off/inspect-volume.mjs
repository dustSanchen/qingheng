import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('id="volume-table"');
console.log(html.slice(i-300, i+200).replace(/\s+/g,' '));
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const j = app.indexOf('volume-table');
console.log('JS@', j, app.slice(j-80, j+420).replace(/\s+/g,' ').slice(0,420));
