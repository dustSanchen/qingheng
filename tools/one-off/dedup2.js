import fs from 'node:fs';
let html=fs.readFileSync('app/src/main/assets/index.html','utf8');
function dropFirst(startMarker, nextMarker, label){
  const first=html.indexOf(startMarker);
  const second=html.indexOf(nextMarker, first+startMarker.length);
  if(first<0||second<0) throw new Error(`${label}: markers not found`);
  html = html.slice(0, first) + html.slice(second);
  console.log(`removed duplicate ${label}`);
}
dropFirst('<article class="card" id="training-log">', '<article class="card" id="training-log">', 'training card');
dropFirst('<div class="card-heading"><h2>训练容量（渐进超负荷）</h2>', '<div class="card-heading"><h2>训练容量（渐进超负荷）</h2>', 'volume table');
fs.writeFileSync('app/src/main/assets/index.html', html);
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const counts={}; for(const id of ids) counts[id]=(counts[id]||0)+1;
console.log('重复 id:', Object.entries(counts).filter(([,n])=>n>1).map(([k,n])=>`${k}×${n}`).join(', ') || '无');
