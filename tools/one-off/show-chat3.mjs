import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const i = t.indexOf('private JSONObject chatReply(JSONObject b, ChatCompletion.Delta sink, ChatCompletion');
if (i < 0) { const j = t.indexOf('chatReply(JSONObject b, ChatCompletion.Delta sink, ChatCompletion.Delta onThink'); console.log('alt', j); }
console.log(t.slice(i, i + 2200));
