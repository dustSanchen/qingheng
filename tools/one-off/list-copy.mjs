import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const re = /<(p|div)[^>]*class="(?:muted|fine-print)[^"]*"[^>]*>([\s\S]*?)<\/\1>/g;
let n = 0;
for (const m of html.matchAll(re)) {
  const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (text.length < 24) continue;
  console.log('[' + text.length + '] ' + text);
  if (++n > 26) break;
}
