import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const i = t.indexOf('JSONArray numericWindow(');
console.log(t.slice(i, i + 1500));
