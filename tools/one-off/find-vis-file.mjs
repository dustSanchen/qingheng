import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  const i = t.indexOf('applyTrainingVisibility');
  if (i < 0) continue;
  console.log('file:', f);
  const def = t.indexOf('function applyTrainingVisibility');
  console.log('def at', def);
  if (def >= 0) console.log(JSON.stringify(t.slice(def, def + 400)));
}
