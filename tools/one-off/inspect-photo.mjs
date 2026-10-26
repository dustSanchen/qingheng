import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const r = html.indexOf('id="view-records"');
const recs = html.slice(r, html.indexOf('id="view-chat"'));
for (const key of ['拍照','从相册选择','record-meals']) {
  const i = recs.indexOf(key);
  console.log('== ' + key + ' @' + i);
  if (i >= 0) console.log(recs.slice(Math.max(0, i - 260), i + 80).replace(/\s+/g,' '));
}
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const j = app.indexOf("record-meals");
console.log('== app record-meals ctx:', JSON.stringify(app.slice(Math.max(0,j-200), j+80)));
