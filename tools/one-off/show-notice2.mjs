import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/00-head.fragment.js','utf8');
const i = t.indexOf("const notice");
console.log('notice decl:', i);
console.log(t.slice(Math.max(0, i - 160), i + 260));
const files = fs.readdirSync('app/src/fragments');
for (const f of files) {
  const s = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  const j = s.indexOf("daily-three-form').addEventListener");
  const k = s.indexOf('saveDailyThree');
  if (j >= 0 || k >= 0) { console.log('=== ' + f + ' j=' + j + ' k=' + k); if (j >= 0) console.log(s.slice(j, j + 800)); if (k >= 0) console.log(s.slice(k, k + 900)); }
}
