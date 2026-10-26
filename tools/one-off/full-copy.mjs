import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const rows = [];
for (const m of html.matchAll(/<p class="fine-print"[^>]*>([\s\S]*?)<\/p>/g)) {
  const raw = m[1].replace(/\s+/g, ' ').trim();
  const text = raw.replace(/<[^>]+>/g, '').trim();
  if (text.length > 80) rows.push({raw, text});
}
for (const r of rows.slice(0, 6)) {
  console.log('=== LEN ' + r.text.length);
  console.log('RAW: ' + r.raw);
  console.log('');
}
