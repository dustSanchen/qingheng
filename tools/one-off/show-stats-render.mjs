import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const key of ["$('#trend-stats')", "volume-table", "trend-weekly"]) {
  console.log('===== ' + key);
  let from = 0, n = 0;
  while (n < 3) {
    const i = app.indexOf(key, from);
    if (i < 0) break;
    console.log('…' + app.slice(Math.max(0, i - 160), i + 220).replace(/\s+/g, ' '));
    from = i + key.length; n++;
  }
}
