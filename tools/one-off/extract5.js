const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
for (const id of ['meal-form','manual-meal-form']) {
  const i=html.indexOf(`id="${id}"`);
  if(i<0){console.log(id,'not found');continue;}
  const t=html.slice(i, html.indexOf('</form>', i));
  const fields=[...t.matchAll(/<(input|select|textarea|button)([^>]*)>/g)].map(m=>{
    const a=m[2];
    const name=(a.match(/name="([^"]*)"/)||[])[1]||'';
    const id2=(a.match(/id="([^"]*)"/)||[])[1]||'';
    const type=(a.match(/type="([^"]*)"/)||[])[1]||m[1];
    return [m[1],type,name||id2].join('|');
  });
  console.log(`== ${id} ==\n`+fields.join('  '));
}
