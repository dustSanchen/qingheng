import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const NL = '\n';

// 1) 一个入口 + 一个操作表
let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const oldChips = html.slice(html.indexOf('<div class="capture-actions">'), html.indexOf('</div>', html.indexOf('capture-actions')) + 6);
const newEntry = '<button type="button" class="photo-add" id="photo-add"><img class="photo-add-icon" src="./icon-camera.svg" alt="" width="20" height="20"><span>添加照片</span><small>可选 · 用来估算份量</small></button>';
if (oldChips.includes('capture-button')) {
  html = html.replace(oldChips, newEntry);
  console.log('photo entry replaced');
}
if (!html.includes('id="photo-sheet"')) {
  const sheet = '<div class="term-sheet" id="photo-sheet" hidden role="dialog" aria-modal="true" aria-labelledby="photo-title"><div class="term-panel"><div class="term-head"><strong id="photo-title">添加照片</strong><button type="button" class="term-close" id="photo-close" aria-label="关闭">×</button></div><button type="button" class="sheet-row" id="photo-take"><span>拍一张</span><small>用后置相机</small></button><button type="button" class="sheet-row" id="photo-pick"><span>从相册选</span><small>用已有照片</small></button></div></div>';
  html = html.replace('<div class="term-sheet" id="weight-sheet"', sheet + NL + '<div class="term-sheet" id="weight-sheet"');
  console.log('photo sheet added');
}
fs.writeFileSync('app/src/main/assets/index.html', html);

// 2) 交互
patch('app/src/fragments/70-rest.fragment.js', [
  ['photo sheet wiring',
   '  /** 杠铃总重计算器：杆重 + 2 × 每侧片重。 */',
   [
     '  /** 拍照与相册收进一个入口：页面只占一行，选择放进操作表。 */',
     '  function installPhotoEntry() {',
     '    const open = $("#photo-add"), sheet = $("#photo-sheet");',
     '    if (!open || !sheet) return;',
     '    if (!open.dataset.wired) {',
     '      open.dataset.wired = "1";',
     '      open.addEventListener("click", () => { sheet.hidden = false; });',
     '    }',
     '    const close = $("#photo-close");',
     '    if (close && !close.dataset.wired) { close.dataset.wired = "1"; close.addEventListener("click", () => { sheet.hidden = true; }); }',
     '    const take = $("#photo-take"), pick = $("#photo-pick");',
     '    if (take && !take.dataset.wired) { take.dataset.wired = "1"; take.addEventListener("click", () => { sheet.hidden = true; const input = $("#meal-image"); if (input) input.click(); }); }',
     '    if (pick && !pick.dataset.wired) { pick.dataset.wired = "1"; pick.addEventListener("click", () => { sheet.hidden = true; const input = $("#meal-gallery"); if (input) input.click(); }); }',
     '    if (!sheet.dataset.wired) {',
     '      sheet.dataset.wired = "1";',
     '      sheet.addEventListener("click", event => { if (event.target === sheet) sheet.hidden = true; });',
     '    }',
     '  }',
     '',
     '  /** 杠铃总重计算器：杆重 + 2 × 每侧片重。 */'
   ].join(NL)],
  ['install photo entry on boot',
   '    if (typeof installWeightCalc === "function") installWeightCalc();',
   '    if (typeof installWeightCalc === "function") installWeightCalc();' + NL + '    if (typeof installPhotoEntry === "function") installPhotoEntry();'],
]);

// 3) 样式
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.photo-add')) {
  css += NL + [
    '/* 添加照片：一行入口（44px），比两个大砖省空间，比两个小胶囊好点。 */',
    '.photo-add{display:flex;align-items:center;gap:var(--space-2);width:100%;margin:var(--space-2) 0 0;padding:11px 12px;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface);text-align:left}',
    '.photo-add:active{background:var(--surface-soft)}',
    '.photo-add-icon{width:var(--icon-md);height:var(--icon-md);opacity:.8;flex:0 0 auto}',
    '.photo-add>span{font-size:var(--text-md);color:var(--body-text);flex:0 0 auto}',
    '.photo-add small{margin-left:auto;font-size:var(--text-xs);color:var(--muted)}',
    '',
    '/* 操作表里的两行：56px，手指好点，又不喧宾夺主。 */',
    '.sheet-row{display:flex;align-items:baseline;gap:var(--space-2);width:100%;padding:14px 2px;border:0;border-top:1px solid var(--line);background:transparent;text-align:left}',
    '.sheet-row:active{background:var(--surface-soft)}',
    '.sheet-row>span{font-size:var(--text-md);color:var(--ink)}',
    '.sheet-row small{margin-left:auto;font-size:var(--text-xs);color:var(--muted)}',
    ''
  ].join(NL);
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('photo entry styles');
}

console.log('photo entry wired');
