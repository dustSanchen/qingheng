import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('role="tablist"');
console.log(html.slice(i-200, i+700).replace(/\s+/g,' '));
