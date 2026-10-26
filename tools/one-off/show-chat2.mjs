import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
let from = 0;
for (let n = 0; n < 6; n++) {
  const i = t.indexOf('chatReply', from);
  if (i < 0) break;
  console.log('--- @' + i + ' ' + JSON.stringify(t.slice(Math.max(0, i - 80), i + 120)));
  from = i + 9;
}
const j = t.indexOf('/api/chat');
console.log('=== /api/chat ctx');
console.log(t.slice(Math.max(0, j - 600), j + 700));
