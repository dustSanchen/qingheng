import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
const from = '.warn-line{margin:0 0 6px;padding:8px 10px;border-radius:10px;background:#fdf5f3;border:1px solid #e8cfc9;font-size:12.5px;color:#8a4b42}';
const to = '.warn-line{margin:0 0 var(--space-1);padding:10px 12px;border-radius:var(--radius-sm);background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--danger);font-size:var(--text-sm);line-height:1.6;color:var(--body-text)}';
if (!css.includes(from)) { console.log('MISS warn-line'); } else {
  css = css.replace(from, to);
  console.log('ok  warn-line 中性化');
}
// 顺手把另外两块有色底也改用令牌（diet-audit / plan-cue 用 surface-soft 已中性）
css = css.replace('background:#f6f8f3', 'background:var(--surface-soft)');
css = css.replace('background:#f2f6ee;color:#4d6b52', 'background:var(--surface-soft);color:var(--body-text)');
fs.writeFileSync(f, css);
const nums = (css.match(/#[0-9a-fA-F]{6}/g) || []).length;
console.log('剩余硬编码色值数量（全表）:', nums);
console.log('warn-line 现有:', (css.match(/\.warn-line\{[^}]*\}/) || [''])[0].slice(0, 140));
