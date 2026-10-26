import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  if (t.includes('switchTab(restoreTab())')) console.log('found in', f);
}
