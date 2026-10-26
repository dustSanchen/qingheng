import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf("api('/api/estimate'");
console.log('estimate api @', i);
if (i > 0) console.log(app.slice(Math.max(0,i-700), i+200).replace(/\s+/g,' ').slice(0,900));
