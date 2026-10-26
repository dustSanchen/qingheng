import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
if (!css.includes('/* capture v3')) {
  css += `
/* capture v3：与应用里的 hub 行同一套语言——无边框、浅底、图标圆形托底。 */
.capture-actions{display:flex;gap:var(--space-2);margin:var(--space-1) 0 0}
.capture-card{flex:1 1 0;display:flex;align-items:center;gap:var(--space-2);min-height:56px;padding:10px 12px;border:0;border-radius:var(--radius-md);background:var(--surface-soft);color:var(--body-text);font-size:var(--text-sm)}
.capture-card:active{background:var(--line);transform:none}
.capture-card img{width:var(--icon-md);height:var(--icon-md);padding:6px;box-sizing:content-box;border-radius:10px;background:var(--surface);opacity:.9;flex:0 0 auto}
.capture-card span{font-weight:500}

/* 问答页：减弱方框感——虚线框变细线、同意项合并为紧凑列表。 */
.upload-area, .upload-area.compact{border:0;background:transparent;padding:0;margin:0}
details[open] .preview-panel, .data-preview-panel{border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface-soft)}
.check-label{padding:var(--space-2) 0;border-top:1px solid var(--line);gap:var(--space-2)}
.check-label + .check-label{border-top:0;padding-top:0}
`;
  fs.writeFileSync(f, css);
  console.log('capture v3 + qa calm styles');
}
