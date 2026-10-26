import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  if (t.includes('function estimateTotals')) {
    const lines = t.split(/\r?\n/);
    const i = lines.findIndex(l => l.includes('function estimateTotals'));
    console.log('file:', f, 'line:', i+1);
    for (let k=i; k<i+12; k++) console.log((k+1) + '  ' + (lines[k]||'').trim().slice(0,160));
  }
}
