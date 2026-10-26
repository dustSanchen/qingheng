import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const s = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  for (const key of ['daily-three', '/api/measurements', 'oilSpoons']) {
    const idxs = [...s.matchAll(new RegExp(key.replace(/[/\\-]/g, m => '\\' + m), 'g'))].map(m => m.index);
    if (idxs.length && key === 'daily-three') console.log(f, key, 'x' + idxs.length, 'first@' + idxs[0]);
  }
}
const t = fs.readFileSync('app/src/fragments/70-rest.fragment.js','utf8');
const i = t.indexOf('daily-three');
console.log(t.slice(Math.max(0, i - 100), i + 1000));
