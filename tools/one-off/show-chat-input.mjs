import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('chat-question');
console.log(html.slice(Math.max(0, i - 700), i + 700).replace(/></g, '>\n<'));
