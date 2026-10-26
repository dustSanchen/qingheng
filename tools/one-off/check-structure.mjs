import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
for (const id of ['view-today','view-records','view-chat','view-trends','view-me']) {
  const i = html.indexOf('id="' + id + '"');
  console.log(id, i);
}
// 粗略配对：统计 article/section/details 开闭
for (const tag of ['article','section','details','div']) {
  const open = (html.match(new RegExp('<' + tag + '\\b', 'g'))||[]).length;
  const close = (html.match(new RegExp('</' + tag + '>', 'g'))||[]).length;
  console.log(tag, open, close, open === close ? 'OK' : 'MISMATCH');
}
console.log('html length', html.length);
