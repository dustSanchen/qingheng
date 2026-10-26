import fs from 'node:fs';

let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
let n = 0;

// ── A. 记录页：换成两枚中等并排卡（72px，图标 24）
const entryBtn = html.slice(html.indexOf('<button type="button" class="photo-add"'), html.indexOf('</button>', html.indexOf('photo-add')) + 9);
if (entryBtn.includes('photo-add')) {
  html = html.replace(entryBtn, '<div class="capture-actions"><label for="meal-image" class="capture-card"><img class="capture-icon" src="./icon-camera.svg" alt="" width="24" height="24"><span>拍照</span></label><label for="meal-gallery" class="capture-card"><img class="capture-icon" src="./icon-gallery.svg" alt="" width="24" height="24"><span>从相册选</span></label></div>');
  n++; console.log('meal capture -> two medium cards');
}

// ── A2. 问答页：同样两枚中等卡
const chatOld = /<div class="capture-actions"[^>]*>(?:(?!<\/div>)[\s\S])*?拍照提问[\s\S]*?<\/div><\/div>/;
const chatMatch = html.match(chatOld);
if (chatMatch) {
  html = html.replace(chatMatch[0], '<div class="capture-actions"><label for="chat-image" class="capture-card"><img class="capture-icon" src="./icon-camera.svg" alt="" width="24" height="24"><span>拍张照片</span></label><label for="chat-gallery" class="capture-card"><img class="capture-icon" src="./icon-gallery.svg" alt="" width="24" height="24"><span>从相册选</span></label></div>');
  n++; console.log('chat capture -> two medium cards');
} else {
  console.log('MISS chat capture block');
}

// ── B. 删掉不需要的描述：可选说明、操作表、已配置模型长句
if (html.includes('id="photo-sheet"')) {
  const s = html.indexOf('<div class="term-sheet" id="photo-sheet"');
  const e = html.indexOf('<div class="term-sheet" id="weight-sheet"');
  html = html.slice(0, s) + html.slice(e);
  n++; console.log('photo sheet removed');
}
const modelNote = html.indexOf('已配置外部文字模型');
if (modelNote > 0) {
  const pStart = html.lastIndexOf('<p', modelNote);
  const pEnd = html.indexOf('</p>', modelNote) + 4;
  html = html.slice(0, pStart) + html.slice(pEnd);
  n++; console.log('model note removed');
}
fs.writeFileSync('app/src/main/assets/index.html', html);
console.log('html changes:', n);

// ── 样式
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.capture-card')) {
  css += [
    '',
    '/* 拍照/相册：两枚中等卡并排（72px），点击目标够大又不抢版面。 */',
    '.capture-actions{display:flex;gap:var(--space-2)}',
    '.capture-card{flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:72px;padding:10px;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface);color:var(--body-text);font-size:var(--text-sm)}',
    '.capture-card:active{background:var(--surface-soft)}',
    '.capture-card img{width:var(--icon-lg);height:var(--icon-lg);opacity:.85}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('capture-card styles');
}
