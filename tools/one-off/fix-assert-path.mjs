import fs from 'node:fs';

const f = 'tests/meal-date-java.test.mjs';
let t = fs.readFileSync(f, 'utf8');
const bad = "  const java = fs.readFileSync(new URL('java/cn/qingheng/health/MainActivity.java', root), 'utf8');";
if (t.includes(bad)) {
  t = t.replace(bad, "  const java = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/MainActivity.java', import.meta.url), 'utf8');");
  fs.writeFileSync(f, t);
  console.log('path fixed');
} else console.log('bad line not found');
