import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const key of ['function buildWeekPlan','function weekPlan','nextMonday','function renderWeekPlan']) {
  const i = app.indexOf(key);
  if (i > 0) console.log('--- ' + key + ' @' + i + '\n' + app.slice(i, i + 420).replace(/\n/g,' ').slice(0,420));
}
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const j = html.indexOf('chat-capture');
console.log('chat capture block:', j);
const k = html.indexOf('拍照提问');
console.log(html.slice(k-260, k+260).replace(/\s+/g,' '));
