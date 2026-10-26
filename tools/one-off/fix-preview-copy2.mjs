import fs from 'node:fs';
let html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const pairs = [
  ['这里只是预览，不会发送任何内容；点「获取建议」并勾选同意后才会发送给已配置的外部模型。', '仅预览，不发送；点「获取建议」并同意后才发送。'],
];
for (const [long, short] of pairs) {
  if (html.includes(long)) { html = html.split(long).join(short); console.log('replaced:', long.slice(0, 16)); }
  else console.log('MISS:', long.slice(0, 16));
}
fs.writeFileSync('app/src/main/assets/index.html', html);
const left = (html.match(/class="fine-print"/g) || []).length;
console.log('remaining fine-print blocks:', left);
