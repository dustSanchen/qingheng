import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
console.log('剩余英文眉题:', (html.match(/class="eyebrow"/g)||[]).length);
// 每个 card 的小字/说明数量与字符量
const cards = [...html.matchAll(/<article class="card"[^>]*>/g)];
const rows = [];
for (const m of cards) {
  const start = m.index;
  const end = html.indexOf('</article>', start);
  const block = html.slice(start, end);
  const title = (block.match(/<h2[^>]*>([^<]{1,18})/) || [])[1] || '?';
  const fine = (block.match(/class="fine-print"/g) || []).length;
  const muted = (block.match(/class="muted"/g) || []).length;
  const text = block.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  rows.push({title, fine, muted, chars: text.length});
}
rows.sort((a,b) => b.chars - a.chars);
for (const r of rows.slice(0, 10)) console.log(r.title.padEnd(12), '说明行 fine/muted:', r.fine + '/' + r.muted, ' 文字量:', r.chars);
console.log('卡片内嵌 details:', (html.match(/<article class="card"[\s\S]{0,4000}?<details/g)||[]).length);
console.log('details 内嵌 card:', (html.match(/<details[\s\S]{0,3000}?<article class="card"/g)||[]).length);
