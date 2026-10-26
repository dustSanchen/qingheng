import fs from 'node:fs';

const f = 'app/src/main/assets/index.html';
let html = fs.readFileSync(f, 'utf8');
const targets = ['模型连接', '问答', '关于轻衡', '每日推送'];
let done = 0;

for (const title of targets) {
  // 定位该卡
  const h2 = html.indexOf('<h2>' + title + '</h2>');
  if (h2 < 0) { console.log('MISS card', title); continue; }
  const cardStart = html.lastIndexOf('<article', h2);
  const cardEnd = html.indexOf('</article>', h2);
  if (cardStart < 0 || cardEnd < 0) { console.log('MISS bounds', title); continue; }
  let block = html.slice(cardStart, cardEnd + 10);

  // 收集卡内所有 fine-print 段落
  const notes = [...block.matchAll(/<p class="fine-print"[^>]*>[\s\S]*?<\/p>/g)].map(m => m[0]);
  if (!notes.length) { console.log('no notes in', title); continue; }

  // 从原位删除，再统一收进卡内 details
  for (const note of notes) block = block.replace(note, '');
  const details = '<details class="card-notes"><summary>说明</summary>' + notes.join('') + '</details>';
  block = block.replace('</article>', details + '</article>');

  html = html.slice(0, cardStart) + block + html.slice(cardEnd + 10);
  done++;
  console.log('ok ', title, '收进', notes.length, '段说明');
}

fs.writeFileSync(f, html);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.card-notes')) {
  css += '\n/* 卡片内说明：默认收起，首屏只留状态与操作。 */\n' +
    '.card-notes{margin:var(--space-3) 0 0;border-top:1px solid var(--line);padding-top:var(--space-2)}\n' +
    '.card-notes > summary{cursor:pointer;font-size:var(--text-xs);color:var(--muted)}\n' +
    '.card-notes[open] > summary{margin-bottom:var(--space-1)}\n' +
    '.card-notes .fine-print{margin:var(--space-1) 0}\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  card-notes styles');
}
console.log('cards collapsed:', done);
