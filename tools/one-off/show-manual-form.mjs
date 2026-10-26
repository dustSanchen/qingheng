import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('manual-meal-form');
const seg = html.slice(i, i + 2600);
// 只打印 input/name 相关行
for (const m of seg.matchAll(/<(input|label)[^>]*>([^<]{0,20})?/g)) {
  const s = m[0].replace(/\s+/g,' ').slice(0, 130);
  if (s.includes('name=') || s.includes('label')) console.log(s);
}
