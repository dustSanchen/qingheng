import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  if (t.includes('renderVolumeTable')) {
    const i = t.indexOf('function renderVolumeTable');
    console.log(f, '@', i);
    console.log(t.slice(i, i + 800));
  }
}
