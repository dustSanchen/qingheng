import fs from 'node:fs';
const a = fs.readFileSync('build/apk112/assets/index.html','utf8');
const b = fs.readFileSync('app/src/main/assets/index.html','utf8');
// 找第一个差异区间
let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
let j = 0; while (j < a.length - i && j < b.length - i && a[a.length-1-j] === b[b.length-1-j]) j++;
console.log('common prefix', i, '| common suffix', j);
console.log('APK segment:', JSON.stringify(a.slice(i, a.length - j)).slice(0, 700));
console.log('CUR segment:', JSON.stringify(b.slice(i, b.length - j)).slice(0, 700));
