import fs from 'node:fs';
const dir = 'app/src/fragments';
for (const f of fs.readdirSync(dir)) {
  const p = dir + '/' + f;
  let t = fs.readFileSync(p, 'utf8');
  if (!t.includes('renderAdviceOrder')) continue;
  const lines = t.split(/\r?\n/);
  const idx = lines.findIndex(l => /renderLastChat\) renderLastChat\(\);/.test(l));
  if (idx >= 0 && !lines.some(l => /renderAdviceOrder\) renderAdviceOrder/.test(l))) {
    lines.splice(idx + 1, 0, lines[idx].replace('renderLastChat', 'renderAdviceOrder').replace('renderLastChat', 'renderAdviceOrder'));
    fs.writeFileSync(p, lines.join('\n'));
    console.log('hook inserted in', f, 'at line', idx + 2);
  }
}
