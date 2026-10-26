import fs from 'node:fs';
const m = 'app/src/main/java/cn/qingheng/health/MainActivity.java';
let s = fs.readFileSync(m, 'utf8');
const i = s.indexOf('if (out.length() == 0) {');
console.log(s.slice(i, i + 900));
