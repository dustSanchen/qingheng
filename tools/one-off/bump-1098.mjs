import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.97';", "const APP_VERSION = '1.0.98';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.97',[int]$VersionCode=98)", "param([switch]$Clean,[string]$Version='1.0.98',[int]$VersionCode=99)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.97'", "const APP_VERSION = '1.0.98'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}

// 加一条结构断言，防止再次出现标签不配对
const test = 'tests/app-fragments.test.mjs';
let t = fs.readFileSync(test, 'utf8');
if (!t.includes('index.html tag balance')) {
  t = t.replace(/\n(struct|const|let|import)[^\n]*/,
    (m) => m + "\n");
  t += `
// index.html must stay balanced: one stray </div> silently swallows the later views.
{
  const html = fs.readFileSync(new URL('../app/src/main/assets/index.html', import.meta.url), 'utf8');
  for (const tag of ['div', 'article', 'section', 'details']) {
    const open = (html.match(new RegExp('<' + tag + '\\\\b', 'g')) || []).length;
    const close = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    assert.equal(open, close, 'index.html ' + tag + ' tags must balance');
  }
}
`;
  fs.writeFileSync(test, t);
}
console.log('bumped to 1.0.98 + tag balance assertion');
