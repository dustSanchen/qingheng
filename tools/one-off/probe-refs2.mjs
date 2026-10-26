import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const p of ['quick-record-dialog','exact-alarm-settings','health-connect-sync']) {
  console.log('=== ' + p);
  let from = 0, n = 0;
  while (true) {
    const i = app.indexOf(p, from);
    if (i < 0 || n >= 3) break;
    console.log('   …' + app.slice(Math.max(0, i - 150), i + 90).replace(/\s+/g, ' '));
    from = i + p.length; n++;
  }
}
