import fs from 'node:fs';
const dir = 'app/src/fragments';
for (const f of fs.readdirSync(dir)) {
  const t = fs.readFileSync(dir + '/' + f, 'utf8');
  if (!/renderAdviceOrder/.test(t)) continue;
  console.log('file:', f, '| defs:', (t.match(/function renderAdviceOrder/g)||[]).length, '| calls:', (t.match(/renderAdviceOrder\(\);/g)||[]).length);
  const lines = t.split(/\r?\n/);
  lines.forEach((l, i) => { if (/applyTrainingVisibility|renderLastChat|renderAdviceOrder/.test(l)) console.log('  ' + (i+1) + ': ' + l.trim().slice(0,90)); });
}
