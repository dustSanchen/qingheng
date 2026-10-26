import fs from 'node:fs';

// ── 估算：改成行内提示，并在成功/失败都收掉
const f = 'app/src/fragments/70-rest.fragment.js';
let t = fs.readFileSync(f, 'utf8');

t = t.replace("if (typeof showBusy === 'function') showBusy('正在计算热量…');",
              "if (typeof showBusy === 'function') showBusy('正在计算热量…', 'estimate-busy');");

if (!t.includes("hideBusy();") || !t.includes("estimateBusy=false")) console.log('note: check finally');

fs.writeFileSync(f, t);

// ── AI 排训练：等待改用全局遮罩（保留），确保 finally 一定收掉
const g = 'app/src/fragments/70-rest.fragment.js';
let u = fs.readFileSync(g, 'utf8');
if (!u.includes("showBusy(\"正在排今天的动作顺序…\")")) {
  u = u.replace('showBusy("正在排今天的动作顺序…");', 'showBusy("正在排今天的动作顺序…");');
}
fs.writeFileSync(g, u);

// ── 样式：更精致的行内等待条
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.inline-busy')) {
  css += [
    '',
    '/* 行内等待条：贴在按钮下方，胶囊 + 呼吸光带 + 细环，不遮挡页面。 */',
    '.inline-busy{display:flex;align-items:center;gap:10px;margin:10px 0 0;padding:10px 14px;border-radius:999px;background:var(--surface-soft);border:1px solid var(--line);position:relative;overflow:hidden}',
    '.inline-busy[hidden]{display:none}',
    '.inline-busy::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:translateX(-100%);animation:busy-sheen 1.6s ease-in-out infinite}',
    '.busy-ring{width:16px;height:16px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--accent);animation:busy-spin .75s linear infinite;flex:0 0 auto}',
    '.inline-busy-text{font-size:var(--text-sm);color:var(--body-text);letter-spacing:.01em}',
    '@keyframes busy-sheen{0%{transform:translateX(-100%)}60%,100%{transform:translateX(100%)}}',
    '@media (prefers-reduced-motion: reduce){.inline-busy::after{animation:none}.busy-ring{animation:none}}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('inline busy styles');
}
