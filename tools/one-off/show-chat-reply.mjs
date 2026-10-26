import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const i = t.indexOf('private String chatReply');
console.log(t.slice(i < 0 ? 0 : i, (i < 0 ? 0 : i) + 2600));
