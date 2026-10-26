import fs from 'node:fs';
let html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const long = '这里只是预览，不会发送任何内容；真正发送仍需你勾选下方同意并点击提问。数据为你本机的记录数字与分析日期，不含姓名、备注原文、记录编号、密钥或照片。';
const short = '仅预览，不发送；发送仍要点「提问」。';
const i = html.indexOf('这里只是预览，不会发送任何内容');
console.log('ctx:', JSON.stringify(html.slice(Math.max(0, i - 120), i + 60)));
if (html.includes(long)) { html = html.replace(long, short); fs.writeFileSync('app/src/main/assets/index.html', html); console.log('replaced'); }
else console.log('exact long string not found — 需按实际文本替换');
