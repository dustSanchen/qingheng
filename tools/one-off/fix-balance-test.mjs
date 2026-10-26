import fs from 'node:fs';

const f = 'tests/app-fragments.test.mjs';
let t = fs.readFileSync(f, 'utf8');
// 该测试用的是自带的 check()，没有引入 node:assert —— 改用同样的 check 形式
const block = `{
  const html = fs.readFileSync(new URL('../app/src/main/assets/index.html', import.meta.url), 'utf8');
  for (const tag of ['div', 'article', 'section', 'details']) {
    const open = (html.match(new RegExp('<' + tag + '\\\\b', 'g')) || []).length;
    const close = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    check('index.html ' + tag + ' tags balance', open === close, open + ' vs ' + close);
  }
}`;
const from = t.indexOf('// index.html must stay balanced');
if (from < 0) throw new Error('block not found');
t = t.slice(0, from) + block + '\n';
fs.writeFileSync(f, t);
console.log('assertion rewritten with check()');
