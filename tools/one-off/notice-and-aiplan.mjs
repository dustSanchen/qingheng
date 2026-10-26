import fs from 'node:fs';

// ── 1) 提示框：改为底部浮动、可关闭、不挡视线
const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const from = "const notice = (message, error = false) => { const node = $('#global-notice'), text = $('#global-notice-text'); if (!node || !text) return; text.textContent = message; node.classList.toggle('error', error); node.hidden = !message;";
if (!t.includes('global-notice.inline')) {
  if (!t.includes(from)) throw new Error('notice anchor missing');
  const to = "const notice = (message, error = false) => { const node = $('#global-notice'), text = $('#global-notice-text'); if (!node || !text) return; text.textContent = message; node.classList.toggle('error', error); node.classList.add('inline'); node.hidden = !message;";
  t = t.replace(from, to);
  console.log('notice switched to floating banner');
}
fs.writeFileSync(f, t);

// ── 2) 样式：固定在底部、可点 × 关闭
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('/* 提示条：贴在屏幕底部')) {
  css += [
    '',
    '/* 提示条：贴在屏幕底部（当前页上方），不遮内容，可随时关闭。 */',
    '#global-notice.inline{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:180;margin:0;box-shadow:0 10px 30px -22px rgba(20,20,19,.55);animation:notice-in .18s ease-out}',
    '#global-notice.inline[hidden]{display:none}',
    '@keyframes notice-in{from{transform:translateY(6px);opacity:0}to{transform:translateY(0);opacity:1}}',
    '@media (prefers-reduced-motion: reduce){#global-notice.inline{animation:none}}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('floating notice styles');
}

// ── 3) AI 排训练请求：补齐问答同款字段，避免后端缺参
const g = 'app/src/fragments/70-rest.fragment.js';
let u = fs.readFileSync(g, 'utf8');
const callFrom = 'api("/api/chat", {question: prompt, date: activeDate, consent: true})';
const callTo = 'api("/api/chat", {question: prompt, date: activeDate, webSearch: false, tier: "fast"})';
if (u.includes(callFrom)) { u = u.replace(callFrom, callTo); fs.writeFileSync(g, u); console.log('ai plan payload aligned with chat'); }
else console.log('ai plan call anchor missing');
