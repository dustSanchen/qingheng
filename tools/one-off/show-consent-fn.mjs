import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8').split(/\r?\n/);
for (let k = 2993; k < 3012; k++) console.log((k+1) + '  ' + (t[k]||'').slice(0,150));
