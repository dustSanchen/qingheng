import fs from 'node:fs';
let html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const start='<article class="card" id="daily-three">';
const anchor='<article class="card energy-card"><div class="card-heading"><h2>今日能量</h2>';
const first=html.indexOf(start);
const second=html.indexOf(start, first+1);
if(second<0) throw new Error('no duplicate found');
// The duplicated block is [inserted][inserted][anchor]; drop the first copy.
html = html.slice(0, first) + html.slice(second);
fs.writeFileSync('app/src/main/assets/index.html', html);
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const counts={}; for(const id of ids) counts[id]=(counts[id]||0)+1;
const dup=Object.entries(counts).filter(([,n])=>n>1);
console.log('重复 id:', dup.length? dup.map(([k,n])=>`${k}×${n}`).join(', ') : '无');
console.log('daily-three 出现次数:', html.split(start).length-1);
