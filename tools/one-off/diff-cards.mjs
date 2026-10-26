import fs from 'node:fs';
const now = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css','utf8');
const before = fs.readFileSync('D:/AI/health-android/build/styles.before-tokens.css','utf8');
function show(css, label) {
  const m = css.match(/\.card\{[^}]*\}/);
  console.log(label, m && m[0].slice(0, 220));
  const s = css.match(/\.segment\.active[^}]*\}/);
  console.log(label, 'segment:', s && s[0].slice(0, 160));
}
show(before, 'BEFORE');
show(now, 'NOW');
const w = now.match(/\.warn-line\{[^}]*\}/);
console.log('NOW warn-line:', w && w[0].slice(0, 220));
