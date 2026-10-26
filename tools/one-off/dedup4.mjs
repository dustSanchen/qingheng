import fs from 'node:fs';
let html=fs.readFileSync('app/src/main/assets/index.html','utf8');
// Remove every version block, then insert exactly one before 本机存储.
const block=/<h3>版本与口径<\/h3><div class="row-meta" id="version-info"><span>正在读取版本…<\/span><\/div><p class="fine-print">每条记录都由当时的提示词与口径算出；升级后旧记录不会被重新解释，这里的版本号用于区分。<\/p>/g;
const found=(html.match(block)||[]).length;
html=html.replace(block,'');
const anchor='<h3>本机存储</h3>';
if(html.split(anchor).length-1!==1) throw new Error('storage heading anchor missing');
html=html.replace(anchor, '<h3>版本与口径</h3><div class="row-meta" id="version-info"><span>正在读取版本…</span></div><p class="fine-print">每条记录都由当时的提示词与口径算出；升级后旧记录不会被重新解释，这里的版本号用于区分。</p>' + anchor);
fs.writeFileSync('app/src/main/assets/index.html', html);
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const counts={}; for(const id of ids) counts[id]=(counts[id]||0)+1;
console.log('原块数:', found, '→ 现在:', (html.match(block)||[]).length);
console.log('重复 id:', Object.entries(counts).filter(([,n])=>n>1).map(([k,n])=>`${k}×${n}`).join(', ') || '无');
