import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('id="view-trends"');
const seg = html.slice(i, i + 1200);
console.log(seg.replace(/\s+/g,' ').slice(0, 1100));
console.log('=== occurrences of view-me / section id= ===');
for (const m of html.matchAll(/<section[^>]*id="([^"]*)"/g)) console.log(m[1]);
