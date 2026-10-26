import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
console.log('guarded deletes:', (t.match(/if \(!KEEP_CAPTURE_ORIGINAL\) try/g)||[]).length);
const i = t.indexOf('private void discardPendingCapture');
console.log(t.slice(i, i + 460));
