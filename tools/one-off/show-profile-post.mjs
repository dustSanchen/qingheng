import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8').split(/\r?\n/);
for (let k = 1566; k < 1600; k++) console.log((k+1) + '  ' + (t[k]||'').slice(0,160));
