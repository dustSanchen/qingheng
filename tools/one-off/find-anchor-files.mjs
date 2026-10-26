import fs from 'node:fs';
const dir = 'app/src/fragments';
for (const f of fs.readdirSync(dir)) {
  const t = fs.readFileSync(dir + '/' + f, 'utf8');
  for (const k of ['GOAL_PRESETS', 'RULE_KEYS', 'proteinMin = Math.round']) {
    const i = t.indexOf(k);
    if (i > 0) console.log(f, k, JSON.stringify(t.slice(i, i + 90)));
  }
}
