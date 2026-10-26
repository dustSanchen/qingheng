import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
let idx = 0, hits = [];
while ((idx = html.indexOf('饮食', idx + 1)) > 0) hits.push(idx);
for (const h of hits.slice(0, 6)) console.log('@' + h + ': ' + html.slice(h - 150, h + 40).replace(/\s+/g,' ').slice(-190));
