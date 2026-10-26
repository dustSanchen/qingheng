import fs from 'node:fs';
const lines = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8').split(/\r?\n/);
for (const a of [[474,500],[580,590],[630,640],[3545,3585]]) {
  console.log('--- ' + (a[0]+1) + '..' + a[1]);
  for (let k = a[0]; k < a[1]; k++) console.log((k+1) + '  ' + (lines[k]||'').slice(0,150));
}
