import fs from 'node:fs';
let html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const marker='<h3>版本与口径</h3>';
const first=html.indexOf(marker);
const second=html.indexOf(marker, first+marker.length);
if(second>=0){ html = html.slice(0, first) + html.slice(second); console.log('removed duplicate version block'); }
fs.writeFileSync('app/src/main/assets/index.html', html);
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const counts={}; for(const id of ids) counts[id]=(counts[id]||0)+1;
console.log('重复 id:', Object.entries(counts).filter(([,n])=>n>1).map(([k,n])=>`${k}×${n}`).join(', ') || '无');
