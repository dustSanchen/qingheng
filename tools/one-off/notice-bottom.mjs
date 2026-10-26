import fs from 'node:fs';

// 1) 提示条固定到底部（纯 CSS，不动 JS 锚点）
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('/* notice pinned to the bottom')) {
  css += [
    '',
    '/* notice pinned to the bottom：不遮顶部内容，随时可点 × 关闭。 */',
    '#global-notice{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));margin:0;z-index:180;box-shadow:0 10px 30px -22px rgba(20,20,19,.55)}',
    '#global-notice[hidden]{display:none}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('notice pinned to bottom');
}

// 2) AI 排训练请求：把 consent 换成问答同款字段
const g = 'app/src/fragments/70-rest.fragment.js';
let u = fs.readFileSync(g, 'utf8');
if (u.includes('consent: true')) {
  u = u.replace('{question: prompt, date: activeDate, consent: true}', '{question: prompt, date: activeDate, webSearch: false, tier: "fast"}');
  fs.writeFileSync(g, u);
  console.log('ai plan payload aligned');
} else if (u.includes('webSearch: false')) {
  console.log('payload already aligned');
} else {
  console.log('ai plan call not found — leaving as is');
}
