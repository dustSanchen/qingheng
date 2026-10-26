import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const i = t.indexOf('chatDataContextCompact');
console.log('first at', i);
console.log(t.slice(Math.max(0, i - 400), i + 900));
