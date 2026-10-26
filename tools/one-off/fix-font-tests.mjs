import fs from 'node:fs';
// 1) 把唯一一处裸字体栈换成令牌，做到「只有两个字体家族」
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
const before = [...css.matchAll(/font-family:\s*([^;}]+)/g)].length;
css = css.replace(/font-family:\s*ui-sans-serif[^;}]+/, 'font-family:var(--font-ui)');
fs.writeFileSync(f, css);
const after = [...css.matchAll(/font-family:\s*([^;}]+)/g)].map(m => m[1]);
console.log('families:', before, '-> non-token:', after.filter(x => !x.includes('var(--font-')).length);

// 2) 图表标签字号断言跟随令牌
const t = 'tests/trends-ui.test.mjs';
let s = fs.readFileSync(t, 'utf8');
s = s.replace("assert(/\\.chart-value\\{[^}]*font-size:12px/.test(css), 'per-point value labels are styled');",
  "assert(/\\.chart-value\\{[^}]*font-size:(12px|var\\(--text-sm\\))/.test(css), 'per-point value labels are styled');");
fs.writeFileSync(t, s);
console.log('trends assertion accepts the token');

// 3) 字体家族断言改为「全部走令牌」
const lib = 'tests/training-library.test.mjs';
let l = fs.readFileSync(lib, 'utf8');
l = l.replace("check('only two font families are declared', (sheet.match(/font-family:/g) || []).length === (sheet.match(/font-family:\\s*var\\(--font-/g) || []).length + 2, String((sheet.match(/font-family:/g) || []).length));",
  "check('every font family goes through a token', (sheet.match(/font-family:\\s*(?!var\\(--font-)/g) || []).length === 0, String((sheet.match(/font-family:\\s*(?!var\\(--font-)/g) || []).length));");
fs.writeFileSync(lib, l);
console.log('family assertion tightened');
