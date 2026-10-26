import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  if (!t.includes('训练负荷')) continue;
  const lines = t.split(/\r?\n/);
  lines.forEach((l,i) => { if (/训练负荷|warn/.test(l) && /class=|innerHTML/.test(l)) console.log(f + ':' + (i+1) + '  ' + l.trim().slice(0,170)); });
}
