import fs from 'node:fs';

const f = 'app/src/main/assets/index.html';
let html = fs.readFileSync(f, 'utf8');

// 我的正则把问答页的隐藏 input 与预览块一起删掉了，补回来
const anchor = '<div class="check-label" data-consent-once="chat">';
const restore = [
  '<input type="file" id="chat-image" accept="image/jpeg,image/png,image/webp" capture="environment" class="sr-only">',
  '<input type="file" id="chat-gallery" accept="image/jpeg,image/png,image/webp" class="sr-only">',
  '<div id="chat-image-preview" hidden><img id="chat-image-view" alt="待发送给模型的照片"><p id="chat-photo-time" class="fine-print"></p><button class="text-button" id="chat-remove-image" type="button">移除照片</button></div>'
].join('');

if (!html.includes('id="chat-image"') && html.includes(anchor)) {
  html = html.replace(anchor, restore + anchor);
  console.log('restored chat inputs + preview');
}
fs.writeFileSync(f, html);

const has = id => html.includes('id="' + id + '"');
console.log('chat-image:', has('chat-image'), '| chat-gallery:', has('chat-gallery'), '| chat-photo-time:', has('chat-photo-time'), '| chat-image-view:', has('chat-image-view'));
