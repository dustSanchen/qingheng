import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  const lines = t.split(/\r?\n/);
  lines.forEach((l, i) => {
    if (/dietBarColor|diet-bar|diet-bar i|rangeColor|underColor|overColor/.test(l)) console.log(f + ':' + (i+1) + '  ' + l.trim().slice(0, 170));
  });
}
