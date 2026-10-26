import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  if (!/renderWeightChart|chart-wrap/.test(t)) continue;
  const i = t.indexOf('function renderWeightChart');
  if (i < 0) continue;
  console.log('file:', f);
  console.log(t.slice(i, i + 1400));
}
