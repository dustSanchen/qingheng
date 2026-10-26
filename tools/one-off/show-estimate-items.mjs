import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const i = t.indexOf('double[][] itemValues');
console.log(t.slice(Math.max(0, i - 300), i + 1200));
