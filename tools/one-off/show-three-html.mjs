import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('daily-three-form');
console.log(html.slice(Math.max(0, i - 900), i + 900).replace(/></g, '>\n<'));
