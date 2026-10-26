import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('生成估算预览');
console.log(html.slice(i-260, i+120).replace(/\s+/g,' '));
