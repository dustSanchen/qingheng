import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('chat-gallery');
console.log('chat-gallery idx', i);
const j = html.indexOf('拍张照片');
console.log(html.slice(j-200, j+420).replace(/\s+/g,' '));
