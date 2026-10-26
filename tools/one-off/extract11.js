const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const i=html.indexOf('id="subpage-data"');
const j=html.indexOf('id="subpage-about"');
console.log(JSON.stringify(html.slice(i, j).slice(-900)));
