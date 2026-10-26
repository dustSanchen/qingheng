import fs from 'node:fs';
// 1) 幽灵按钮字号回落（旧规则把 span 设成 20px）
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.capture-button > span{font-size:var(--text-sm)')) {
  css += '\n.capture-button > span{font-size:var(--text-sm);font-weight:500;letter-spacing:0}\n';
  console.log('ok  chip type size');
}
fs.writeFileSync('app/src/main/assets/styles.css', css);

// 2) 删掉记录页残留的「已配置外部文字模型…」说明
let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const dead = /<p class="fine-print"[^>]*>已配置外部文字模型[^<]*<\/p>/;
if (dead.test(html)) { html = html.replace(dead, ''); console.log('ok  removed the stale model note'); }
else console.log('MISS stale note');
fs.writeFileSync('app/src/main/assets/index.html', html);
