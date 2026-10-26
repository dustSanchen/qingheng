import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const cards = [...html.matchAll(/<article class="card"[^>]*>[\s\S]{0,120}?<h2[^>]*>([^<]{1,24})/g)].map(m => m[1]);
console.log('卡片数:', cards.length);
console.log(cards.join(' / '));
const fine = [...html.matchAll(/<p class="fine-print"[^>]*>/g)].length;
console.log('fine-print 段落数:', fine);
const nested = (html.match(/<article class="card"[\s\S]{0,2000}?<article class="card"/g) || []).length;
console.log('嵌套卡片（粗略）:', nested);
