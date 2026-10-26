import fs from 'node:fs';
const f = 'app/src/main/assets/index.html';
let html = fs.readFileSync(f, 'utf8');
const m = html.match(/<p class="eyebrow">[^<]*<\/p>/);
console.log('剩余:', m && m[0]);
html = html.replace(/<p class="eyebrow">[^<]*<\/p>/g, '');
fs.writeFileSync(f, html);
console.log('removed, left:', (html.match(/class="eyebrow"/g)||[]).length);
