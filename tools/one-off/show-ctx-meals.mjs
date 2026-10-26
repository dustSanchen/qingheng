import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const i = t.indexOf('String chatDataContext');
const seg = t.slice(i, i + 9000);
const j = seg.indexOf('"meals"');
console.log('meals at', j);
console.log(seg.slice(Math.max(0, j - 900), j + 900));
