import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const k of ['trainingEnabled','不健身','trainingMode']) {
  let i = -1, n = 0;
  while ((i = app.indexOf(k, i + 1)) > 0 && n < 5) { console.log('--- ' + k + ' @' + i + ': ' + app.slice(i - 120, i + 200).replace(/\s+/g,' ').slice(0, 280)); n++; }
}
