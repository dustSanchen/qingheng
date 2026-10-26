import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
for (const k of ['data-go="training"','data-focus="training','quick']) {
  const i = html.indexOf(k);
  if (i > 0) console.log(k, '->', html.slice(i-220, i+80).replace(/\s+/g,' ').slice(-260));
}
