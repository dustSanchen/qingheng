const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
function seg(startId, len){const i=html.indexOf(`id="${startId}"`); if(i<0) return '(not found)'; const j=html.indexOf('</section>', i); return html.slice(i, j<0? i+len : j+len);}
const t=seg('subpage-targets');
const fields=[...t.matchAll(/<(input|select|button)([^>]*)>/g)].map(m=>{
  const a=m[2];
  const name=(a.match(/name="([^"]*)"/)||[])[1]||'';
  const id=(a.match(/id="([^"]*)"/)||[])[1]||'';
  const type=(a.match(/type="([^"]*)"/)||[])[1]||m[1];
  const ph=(a.match(/placeholder="([^"]*)"/)||[])[1]||'';
  return [m[1], type, name||id, ph].join(' | ');
});
console.log('== subpage-targets 字段 ==');
console.log(fields.join('\n'));
console.log('== 文本片段 ==');
console.log(t.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,900));
