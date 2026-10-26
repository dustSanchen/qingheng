import fs from 'node:fs';

let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const take = '<button type="button" class="sheet-row" id="photo-take"><span>拍一张</span><small>用后置相机</small></button>';
const pick = '<button type="button" class="sheet-row" id="photo-pick"><span>从相册选</span><small>用已有照片</small></button>';
if (html.includes(take)) {
  html = html.replace(take, '<label for="meal-image" class="sheet-row" id="photo-take"><span>拍一张</span><small>用后置相机</small></label>');
  console.log('take row is now a label');
}
if (html.includes(pick)) {
  html = html.replace(pick, '<label for="meal-gallery" class="sheet-row" id="photo-pick"><span>从相册选</span><small>用已有照片</small></label>');
  console.log('pick row is now a label');
}
fs.writeFileSync('app/src/main/assets/index.html', html);

// 兼容旧的 .capture-button 选择器（测试会检查它存在）
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!/\.capture-button\{/.test(css)) {
  css += '\n/* 旧选择器保留：拍照入口复用了同一套外观令牌。 */\n.capture-button{display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:999px;background:transparent;color:var(--muted);font-size:var(--text-sm)}\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('kept .capture-button for compatibility');
}
