import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('id="chat-history"') >= 0 ? html.indexOf('id="chat-history"') : html.indexOf('chat-log');
console.log('marker index:', i);
const seg = html.slice(Math.max(0, i-400), i+700).replace(/\s+/g,' ');
console.log(seg.slice(0, 1000));
