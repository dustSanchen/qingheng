const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const i=html.indexOf('id="push-form"');
const t=html.slice(i-200, html.indexOf('</form>', i)+7);
console.log(t);
