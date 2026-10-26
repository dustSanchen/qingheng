import fs from 'node:fs';

// ── A. 拍照区：换成紧凑的一行按钮，去掉虚线绿框与大图标
let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const oldStart = html.indexOf('<div class="upload-area">');
const oldEnd = html.indexOf('</div>', html.indexOf('capture-actions')) + 6;
const oldBlock = html.slice(oldStart, oldEnd);
const newBlock = '<div class="capture-actions"><label for="meal-image" class="capture-button"><img class="capture-icon" src="./icon-camera.svg" alt="" width="20" height="20"><span>拍照</span></label><label for="meal-gallery" class="capture-button"><img class="capture-icon" src="./icon-gallery.svg" alt="" width="20" height="20"><span>相册</span></label></div>';
if (oldBlock.includes('capture-actions')) {
  html = html.replace(oldBlock, newBlock);
  console.log('capture row compacted');
}
// 删除冗长说明
const dead = [
  '照片在本机压缩并移除元数据，同意后才发送。',
  '已配置外部文字模型；勾选本次同意才调用外部 API。不勾选时按明确克重离线估算；照片还需已启用视觉模型。'
];
let removed = 0;
for (const text of dead) {
  const p1 = '<p class="fine-print">' + text + '</p>';
  if (html.includes(p1)) { html = html.replace(p1, ''); removed++; }
}
console.log('removed fine-print:', removed);
fs.writeFileSync('app/src/main/assets/index.html', html);

// ── B. 样式：中性、紧凑、无虚线大框
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('/* capture: one compact row')) {
  css += '\n/* capture: one compact row, neutral colours, no dashed frame. */\n' +
    '.upload-area{border:0;background:transparent;padding:0;margin:var(--space-2) 0 0}\n' +
    '.capture-actions{display:flex;gap:var(--space-2)}\n' +
    '.capture-button{flex:0 0 auto;flex-direction:row;gap:6px;padding:8px 14px;border-radius:var(--radius-md);background:var(--surface);border:1px solid var(--line);font-size:var(--text-sm);color:var(--body-text);min-height:0}\n' +
    '.capture-button:active{background:var(--surface-soft);border-color:var(--line);transform:none}\n' +
    '.capture-icon{width:20px;height:20px;opacity:.85}\n' +
    '.capture-button>span{color:inherit}\n' +
    '.capture-button small{display:none}\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('capture styles replaced');
}
