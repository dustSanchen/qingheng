import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('今日训练建议');
console.log(html.slice(i-160, i+320).replace(/\s+/g,' '));
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const k of ['today-training-advice','renderTrainingAdvice','training-advice']) {
  const j = app.indexOf(k);
  if (j > 0) console.log(k, '@', j, app.slice(j-60, j+160).replace(/\s+/g,' '));
}
