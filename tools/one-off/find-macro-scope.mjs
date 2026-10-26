import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  if (!t.includes('macro-summary')) continue;
  const lines = t.split(/\r?\n/);
  const idx = lines.findIndex(l => l.includes("$('#macro-summary')"));
  console.log('file:', f, 'line:', idx + 1);
  for (let i = idx; i > 0 && i > idx - 60; i--) {
    if (/^\s*(async )?function |const range|range\s*=/.test(lines[i])) console.log('  ' + (i+1) + '  ' + lines[i].trim().slice(0, 130));
  }
}
