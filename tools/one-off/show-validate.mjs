import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8').split(/\r?\n/);
for (const a of [[2515,2545],[1565,1585]]) {
  console.log('--- ' + (a[0]+1));
  for (let k = a[0]; k < a[1]; k++) console.log((k+1) + '  ' + (t[k]||'').slice(0,150));
}
