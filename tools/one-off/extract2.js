const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
console.log('file length', html.length);
const idxs=[]; let i=-1;
while((i=html.indexOf('subpage-', i+1))>=0) idxs.push(i);
console.log('subpage- occurrences', idxs.length, idxs.slice(0,12));
for(const k of idxs.slice(0,3)) console.log('---', JSON.stringify(html.slice(k-40, k+120)));
