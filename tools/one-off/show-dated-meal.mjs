import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const i = t.indexOf('JSONObject datedMeal(');
console.log(t.slice(i, i + 700));
console.log('=== numericFields ===');
const j = t.indexOf('JSONObject numericFields(');
console.log(t.slice(j, j + 600));
