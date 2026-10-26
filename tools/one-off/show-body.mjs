import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/ChatCompletion.java','utf8');
const i = t.indexOf('URL destination = endpoint(config.getString("baseUrl"));');
console.log(t.slice(i, i + 1200));
