import fs from 'node:fs';
import { sectionMap } from './section-map.mjs';

const file = 'app/src/main/assets/index.html';
let html = fs.readFileSync(file, 'utf8');
const before = sectionMap(file);

// 问答页：与记录页同款中等卡（同样两个 label，结构不变）
const chatOld = /<label for="chat-image" class="capture-button"><img class="capture-icon" src="\.\/icon-camera\.svg" alt="" width="20" height="20"><strong>拍照提问<\/strong><small>用后置相机<\/small><\/label>/;
const chatOld2 = /<label for="chat-gallery" class="capture-button"><img class="capture-icon" src="\.\/icon-gallery\.svg" alt="" width="20" height="20"><strong>从相册选择<\/strong><small>用已有照片<\/small><\/label>/;
const newCam = '<label for="chat-image" class="capture-card"><img class="capture-icon" src="./icon-camera.svg" alt="" width="24" height="24"><span>拍照提问</span></label>';
const newGal = '<label for="chat-gallery" class="capture-card"><img class="capture-icon" src="./icon-gallery.svg" alt="" width="24" height="24"><span>从相册选</span></label>';

let changed = 0;
if (chatOld.test(html)) { html = html.replace(chatOld, newCam); changed++; }
else if (html.includes('for="chat-image" class="capture-button"')) {
  // 兼容不同写法：只换 class 与结构内的 strong/small
  html = html.replace(/<label for="chat-image" class="capture-button">[\s\S]*?<\/label>/, newCam);
  changed++;
}
if (chatOld2.test(html)) { html = html.replace(chatOld2, newGal); changed++; }
else if (html.includes('for="chat-gallery" class="capture-button"')) {
  html = html.replace(/<label for="chat-gallery" class="capture-button">[\s\S]*?<\/label>/, newGal);
  changed++;
}
console.log('chat labels replaced:', changed);
fs.writeFileSync(file, html);

const after = sectionMap(file);
for (const id of Object.keys(before)) {
  const a = before[id], b = after[id];
  if (b && (a.length !== b.length || a.div !== b.div)) console.log('  ' + id.padEnd(17), a.length, '->', b.length, '| div', a.div, '->', b.div);
}
const open = (html.match(/<div\b/g) || []).length, close = (html.match(/<\/div>/g) || []).length;
console.log('div:', open, close, open === close ? 'OK' : 'MISMATCH');
console.log('capture-card count:', (html.match(/class="capture-card"/g) || []).length);
