import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('id="view-records"');
console.log(html.slice(i, i + 700).replace(/\s+/g,' '));
