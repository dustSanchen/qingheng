import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('capture-actions');
console.log(html.slice(i - 120, i + 900).replace(/\s+/g,' '));
