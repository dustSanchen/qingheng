import fs from 'node:fs';
const dir = 'app/src/fragments';
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.fragment.js')) continue;
  const t = fs.readFileSync(dir + '/' + f, 'utf8');
  const i = t.indexOf('每个动作都要填完整');
  if (i > 0) {
    console.log('FILE:', f);
    console.log('TEXT:', JSON.stringify(t.slice(Math.max(0, i - 120), i + 160)));
  }
}
const old = fs.readFileSync('build/app.before-reassemble.js', 'utf8');
const j = old.indexOf('每个动作都要填完整');
console.log('OLD app.js:', JSON.stringify(old.slice(Math.max(0, j - 120), j + 160)));
