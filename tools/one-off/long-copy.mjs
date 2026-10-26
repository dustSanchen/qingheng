import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const rows = [];
for (const m of html.matchAll(/<p class="fine-print"[^>]*>([\s\S]*?)<\/p>/g)) {
  const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (text.length > 40) rows.push({len: text.length, text});
}
rows.sort((a, b) => b.len - a.len);
console.log('long fine-print blocks:', rows.length);
for (const r of rows.slice(0, 12)) console.log(r.len + ' | ' + r.text.slice(0, 78));
