import fs from 'node:fs';
const lines = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8').split(/\r?\n/);
for (let k = 217; k < 300; k++) console.log((k+1) + '  ' + (lines[k]||'').slice(0,150));
