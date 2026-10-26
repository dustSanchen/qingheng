import fs from 'node:fs';

// ── 空状态三态：empty / denied / error（阶段 3 组件规范落地）
const f = 'D:/AI/health-android/app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const oldFn = /function empty\(text, hint = ''\) \{\s*return `<div class="empty-state"><span class="empty-icon" aria-hidden="true">✧<\/span><p class="empty-title">\$\{esc\(text\)\}<\/p>\$\{hint \? `<p class="empty-hint">\$\{esc\(hint\)\}<\/p>` : ''\}<\/div>`;\s*\}/;
const newFn = [
  'function empty(text, hint = "", kind = "empty") {',
  '    // 三态空状态：empty=还没有数据 / denied=没有权限 / error=加载失败；图标与语气随状态变化。',
  '    const glyph = kind === "denied" ? "⊘" : kind === "error" ? "!" : "✧";',
  '    const role = kind === "error" ? \' role="alert"\' : "";',
  '    return `<div class="empty-state is-${esc(kind)}"${role}><span class="empty-icon" aria-hidden="true">${glyph}</span><p class="empty-title">${esc(text)}</p>${hint ? `<p class="empty-hint">${esc(hint)}</p>` : ""}</div>`;',
  '  }'
].join('\n');

if (oldFn.test(t)) {
  t = t.replace(oldFn, newFn);
  fs.writeFileSync(f, t);
  console.log('empty() 三态化完成');
} else {
  console.log('empty() 未匹配，可能已改过');
}

// ── 样式：三态各自的底色/图标色
let css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.empty-state.is-denied')) {
  css += [
    '',
    '/* 空状态三态：同一骨架，靠图标色与左侧色条区分「没数据 / 没权限 / 加载失败」。 */',
    '.empty-state{border-radius:var(--shape-row-radius);border:1px dashed var(--line);padding:var(--space-4) var(--space-3)}',
    '.empty-state.is-empty{border-style:dashed}',
    '.empty-state.is-denied{border-style:solid;border-left:3px solid var(--warn);background:var(--warn-soft)}',
    '.empty-state.is-denied .empty-icon{color:var(--warn)}',
    '.empty-state.is-error{border-style:solid;border-left:3px solid var(--danger);background:var(--danger-soft)}',
    '.empty-state.is-error .empty-icon{color:var(--danger)}',
    '.empty-title{margin:0;color:var(--ink-soft);font-weight:var(--fw-medium)}',
    '.empty-hint{margin:var(--space-1) 0 0;color:var(--muted);font-size:var(--text-sm);line-height:1.55}'
  ].join('\n') + '\n';
  fs.writeFileSync('D:/AI/health-android/app/src/main/assets/styles.css', css);
  console.log('三态样式已加');
}
