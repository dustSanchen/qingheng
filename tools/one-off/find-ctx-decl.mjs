import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const idxs = [...t.matchAll(/chatDataContext/g)].map(m => m.index);
console.log('refs:', idxs.length);
for (const i of idxs.slice(0, 4)) console.log(JSON.stringify(t.slice(Math.max(0, i - 60), i + 70)));
