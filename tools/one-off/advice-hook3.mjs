import fs from 'node:fs';
const dir = 'app/src/fragments';
let done = false;
for (const f of fs.readdirSync(dir)) {
  const p = dir + '/' + f;
  const t = fs.readFileSync(p, 'utf8');
  if (!/function renderAdviceOrder/.test(t)) continue;
  if (/renderAdviceOrder\) renderAdviceOrder/.test(t)) { console.log('hook already in', f); done = true; break; }
  const lines = t.split(/\r?\n/);
  const i = lines.findIndex(l => /applyTrainingVisibility\(\);/.test(l));
  if (i >= 0) { lines.splice(i + 1, 0, '    if (typeof renderAdviceOrder === "function") renderAdviceOrder();'); fs.writeFileSync(p, lines.join('\n')); console.log('hook added in', f, 'line', i + 2); done = true; break; }
}
if (!done) console.log('no hook added');
