import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const s = fs.readFileSync('app/src/fragments/'+f, 'utf8');
  const j = s.indexOf('prevVolume, 0');
  if (j >= 0) { console.log('in ' + f + ':'); console.log(JSON.stringify(s.slice(Math.max(0,j-200), j+330))); }
}
