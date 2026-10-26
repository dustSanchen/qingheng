import fs from 'node:fs';
const hits = [];
for (const f of fs.readdirSync('tests')) {
  if (!f.endsWith('.mjs')) continue;
  const t = fs.readFileSync('tests/' + f, 'utf8');
  for (const m of t.matchAll(/#[0-9a-fA-F]{6}/g)) hits.push(f + ': ' + m[0]);
}
console.log('color assertions:', hits.length);
console.log([...new Set(hits)].slice(0, 20).join('\n'));
