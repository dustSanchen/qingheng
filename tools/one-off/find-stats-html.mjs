import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  const i = t.indexOf("trend-stats");
  if (i >= 0) {
    console.log('== ' + f);
    console.log(JSON.stringify(t.slice(i - 40, i + 700)));
  }
}
