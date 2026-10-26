const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
for(const k of [19200, 19516, 21484]) console.log('---', JSON.stringify(html.slice(k-30, k+150)));
const i=html.indexOf('subpage-targets');
console.log('indexOf subpage-targets =', i);
if(i>=0){ const t=html.slice(i, html.indexOf('subpage-model', i)); console.log('LEN', t.length); console.log(t.slice(0,1800)); }
