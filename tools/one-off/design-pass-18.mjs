import fs from 'node:fs';

// ── 1. 拍照 / 相册：改成两个「幽灵」小胶囊（无边框、图标 16、文字 13）
let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const oldChips = '<div class="capture-actions"><label for="meal-image" class="capture-button"><img class="capture-icon" src="./icon-camera.svg" alt="" width="20" height="20"><span>拍照</span></label><label for="meal-gallery" class="capture-button"><img class="capture-icon" src="./icon-gallery.svg" alt="" width="20" height="20"><span>相册</span></label></div>';
const newChips = '<div class="capture-actions"><label for="meal-image" class="capture-button"><img class="capture-icon" src="./icon-camera.svg" alt="" width="16" height="16"><span>拍照</span></label><span class="capture-sep" aria-hidden="true">·</span><label for="meal-gallery" class="capture-button"><img class="capture-icon" src="./icon-gallery.svg" alt="" width="16" height="16"><span>从相册选</span></label></div>';
if (html.includes(oldChips)) { html = html.replace(oldChips, newChips); console.log('capture chips redesigned'); }
else console.log('MISS capture chips');

// ── 2. 时段提示变成「现在该做什么」条：左侧色条 + 时间 + 动作按钮
const hint = '<p class="slot-hint" id="slot-hint">—</p>';
const hintNew = '<div class="slot-hint" id="slot-hint"><span class="slot-time" id="slot-time">—</span><span class="slot-text" id="slot-text">—</span></div>';
if (html.includes(hint)) { html = html.replace(hint, hintNew); console.log('slot hint restructured'); }
else console.log('MISS slot hint');
fs.writeFileSync('app/src/main/assets/index.html', html);

// ── 3. 设计语言统一：图标尺寸、标题节奏、幽灵按钮
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('/* ---- design pass 18')) {
  css += `
/* ---- design pass 18: icon scale, rhythm, ghost chips ---- */
:root{--icon-sm:16px;--icon-md:20px;--icon-lg:24px}
.capture-actions{display:flex;align-items:center;gap:var(--space-1);margin:var(--space-1) 0 0}
.capture-button{display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border:0;border-radius:999px;background:transparent;color:var(--muted);font-size:var(--text-sm);min-height:0;line-height:1.2}
.capture-button:active{background:var(--surface-soft);color:var(--body-text);transform:none}
.capture-icon{width:var(--icon-sm);height:var(--icon-sm);opacity:.7;flex:0 0 auto}
.capture-button>span{color:inherit;white-space:nowrap}
.capture-sep{color:var(--line);font-size:var(--text-sm);line-height:1}
.upload-area{border:0;background:transparent;padding:0;margin:0}

.slot-hint{display:flex;align-items:baseline;gap:var(--space-2);margin:0 0 var(--space-3);padding:10px 12px 10px 14px;border-radius:var(--radius-md);background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--accent);font-size:var(--text-sm);color:var(--body-text);line-height:1.6}
.slot-time{flex:0 0 auto;font-variant-numeric:tabular-nums;color:var(--muted);font-size:var(--text-xs);letter-spacing:.02em}
.slot-text{flex:1 1 auto;min-width:0}
.slot-hint[data-slot="night"]{border-left-color:var(--line);color:var(--muted)}

/* 标题节奏：一页一个主标题，副标题只留一行 */
.page-heading h1{margin:0 0 var(--space-2);line-height:1.22;letter-spacing:-.01em}
.page-heading{row-gap:var(--space-2)}
.card-heading{margin-bottom:var(--space-3)}
.card-heading h2{font-size:var(--text-lg);line-height:1.3}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('design pass css added');
}
