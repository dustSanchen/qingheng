import fs from 'node:fs';
for (const f of fs.readdirSync('app/src/fragments')) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  for (const key of ['function renderDailyThree', 'function notice(', 'function sendChat']) {
    const i = t.indexOf(key);
    if (i >= 0) { console.log('=== ' + key + ' in ' + f); console.log(t.slice(i, i + 900)); console.log(); }
  }
}
