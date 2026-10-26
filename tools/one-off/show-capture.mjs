import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('capture-button');
console.log(html.slice(i-420, i+520).replace(/\s+/g,' '));
