import fs from 'node:fs';
const dir = 'D:/AI/health-android/tests';
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.mjs')) continue;
  const t = fs.readFileSync(dir + '/' + f, 'utf8');
  if (/stats-good|#3f7a5e|stats-bad/.test(t)) {
    for (const l of t.split(/\r?\n/)) if (/stats-good|3f7a5e|stats-bad/.test(l)) console.log(f + ': ' + l.trim().slice(0,140));
  }
}
