import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('<h2>关于轻衡</h2>');
const s = html.lastIndexOf('<article', i);
const e = html.indexOf('</article>', i) + 10;
console.log(html.slice(s, e).replace(/\s+/g,' ').slice(0, 900));
