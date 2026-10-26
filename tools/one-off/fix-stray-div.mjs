import fs from 'node:fs';

const f = 'app/src/main/assets/index.html';
let html = fs.readFileSync(f, 'utf8');

function balance(text) {
  const open = (text.match(/<div\b/g) || []).length;
  const close = (text.match(/<\/div>/g) || []).length;
  return {open, close};
}

const before = balance(html);
console.log('before divs:', before);

// 拍照区删掉了 upload-area 的开标签，但保留了它的闭标签 → 多一个 </div>
const stray = '</div></div><div class="check-label" data-consent-once="estimate">';
const fixed = '</div><div class="check-label" data-consent-once="estimate">';
if (html.includes(stray)) {
  html = html.replace(stray, fixed);
  console.log('removed the stray </div>');
} else {
  console.log('stray pattern not found — trying a narrower match');
  const two = '</div></div><div class="check-label"';
  if (html.includes(two)) { html = html.replace(two, '</div><div class="check-label"'); console.log('removed via narrow match'); }
}

fs.writeFileSync(f, html);
console.log('after divs:', balance(html));
