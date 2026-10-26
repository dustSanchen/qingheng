import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const t = html.indexOf('id="view-trends"');
const section = html.slice(t, html.indexOf('id="view-profile"'));
for (const m of section.matchAll(/<th[^>]*>[^<]*<\/th>/g)) console.log('th:', m[0]);
const i = section.indexOf('trend-stats');
console.log('trend-stats ctx:', section.slice(Math.max(0,i-200), i+120).replace(/\s+/g,' '));
const j = section.indexOf('measurement-history');
console.log('history ctx:', section.slice(Math.max(0,j-260), j+60).replace(/\s+/g,' '));
