import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const k of ['record-seg','data-seg','segRecords','function switchRecordTab','records-seg']) {
  const i = app.indexOf(k);
  if (i > 0) console.log('--- ' + k + ' @' + i + ': ' + app.slice(i - 120, i + 220).replace(/\s+/g,' ').slice(0, 300));
}
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const j = html.indexOf('训练</button>');
console.log('seg markup:', html.slice(j-420, j+80).replace(/\s+/g,' '));
