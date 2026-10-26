import fs from 'node:fs';
for (const f of ['app/src/main/assets/app.js','app/src/main/assets/index.html']) {
  const t = fs.readFileSync(f,'utf8');
  const idx = t.indexOf('class="eyebrow"');
  if (idx >= 0) console.log(f, '->', JSON.stringify(t.slice(idx-40, idx+60)));
}
