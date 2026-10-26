import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  for (const key of ['function notice', 'daily-three-form\').addEventListener', 'global-notice']) {
    const i = t.indexOf(key);
    if (i >= 0) { console.log('=== ' + key + ' in ' + f + ' @' + i); console.log(t.slice(i, i + 700)); console.log(); }
  }
}
