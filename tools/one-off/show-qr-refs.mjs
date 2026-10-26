import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
for (const [name, src] of [['app', app], ['html', html]]) {
  console.log('=== ' + name);
  const re = /quick-record[\w-]*/g;
  const seen = new Set();
  for (const m of src.matchAll(re)) seen.add(m[0]);
  console.log([...seen].join(', '));
}
const i = app.indexOf("quick-record-text'");
console.log('=== dialog markup around text input ===');
console.log(app.slice(Math.max(0, i - 700), i + 300));
const j = app.indexOf('focus()');
console.log('=== first focus() ===');
console.log(app.slice(Math.max(0, j - 200), j + 120));
