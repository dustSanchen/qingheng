const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const counts={};
for(const id of ids) counts[id]=(counts[id]||0)+1;
console.log('重复 id:', Object.entries(counts).filter(([,n])=>n>1).map(([k,n])=>`${k}×${n}`).join(', ') || '无');
