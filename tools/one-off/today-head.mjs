import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const start = html.indexOf('id="view-today"');
console.log(html.slice(start, start + 900).replace(/\s+/g,' '));
