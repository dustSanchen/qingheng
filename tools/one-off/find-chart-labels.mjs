import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('weeklyMeans');
const re = /<text[^>]*>[\s\S]{0,80}?<\/text>/g;
let m, count = 0;
const seg = app.slice(i, i + 6000);
while ((m = re.exec(seg)) && count < 6) { console.log('TEXT:', m[0].replace(/\s+/g,' ').slice(0,120)); count++; }
