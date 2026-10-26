import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const k of ['record-tabs','data-record','recordView','seg-','"身体"',"'身体'"]) {
  const i = app.indexOf(k);
  if (i > 0) console.log(k, '@' + i, app.slice(i - 100, i + 160).replace(/\s+/g,' ').slice(0, 250));
}
