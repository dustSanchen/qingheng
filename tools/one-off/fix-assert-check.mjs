import fs from 'node:fs';

const f = 'tests/meal-date-java.test.mjs';
let t = fs.readFileSync(f, 'utf8');

// 这个测试用自带的 check()，没有 node:assert —— 换成 check 形式
const bad = "  assert(java.includes('\"none\".equals(String.valueOf(trainingRaw))'), 'training accepts the literal none');";
const good = "  check('training accepts the literal none', java.includes('\"none\".equals(String.valueOf(trainingRaw))'));";
if (t.includes(bad)) { t = t.replace(bad, good); fs.writeFileSync(f, t); console.log('switched to check()'); }
else console.log('line not found');
