const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const i=html.indexOf('<details class="advanced">');
console.log(html.slice(i, html.indexOf('</details>', i)+10));
