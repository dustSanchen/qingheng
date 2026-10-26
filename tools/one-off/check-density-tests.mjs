import fs from 'node:fs';
for (const f of fs.readdirSync('tests')) {
  if (!f.endsWith('.mjs')) continue;
  const t = fs.readFileSync('tests/' + f, 'utf8');
  if (/body-leading|card-pad|card-gap/.test(t)) {
    for (const l of t.split(/\r?\n/)) if (/body-leading|card-pad|card-gap/.test(l)) console.log(f + ': ' + l.trim().slice(0,130));
  }
}
