import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('关于轻衡');
console.log('about at', i);
console.log(html.slice(Math.max(0, i-900), i+200).replace(/\s+/g,' ').slice(0, 1100));
