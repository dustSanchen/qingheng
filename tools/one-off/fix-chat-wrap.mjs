import fs from 'node:fs';
const f = 'app/src/main/assets/index.html';
let html = fs.readFileSync(f, 'utf8');
const anchor = '<div class="capture-actions"><label for="chat-image" class="capture-card">';
const i = html.indexOf(anchor);
if (i < 0) { console.log('MISS chat block'); process.exit(1); }
// 找到这个 capture-actions 的结束
const end = html.indexOf('</div>', html.indexOf('</label>', html.indexOf('chat-gallery'))) + 6;
const seg = html.slice(i, end);
console.log('block length', seg.length, '| ends with', JSON.stringify(seg.slice(-12)));
const wrapOpen = html.lastIndexOf('<div class="upload-area compact">', i);
console.log('upload-area open at', wrapOpen, '| distance', i - wrapOpen);
if (wrapOpen > 0 && !html.slice(end, end + 20).includes('</div>')) {
  html = html.slice(0, end) + '</div>' + html.slice(end);
  console.log('closed upload-area');
}
fs.writeFileSync(f, html);
const open = (html.match(/<div\b/g)||[]).length, close = (html.match(/<\/div>/g)||[]).length;
console.log('div balance now:', open, close, open === close ? 'OK' : 'MISMATCH');
