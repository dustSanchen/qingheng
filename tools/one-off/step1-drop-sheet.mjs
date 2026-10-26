import fs from 'node:fs';
import { sectionMap } from './section-map.mjs';

const file = 'app/src/main/assets/index.html';
let html = fs.readFileSync(file, 'utf8');

// 删除已不再使用的 photo-sheet（否则 meal-image 会有两个 label，测试与可访问性都不过）
const start = html.indexOf('<div class="term-sheet" id="photo-sheet"');
if (start < 0) { console.log('photo-sheet already removed'); }
else {
  // 用 div 深度配对找到它的结束
  let depth = 0, i = start, end = -1;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) {
    if (m[0] === '</div>') { depth--; if (depth === 0) { end = m.index + m[0].length; break; } }
    else depth++;
  }
  if (end < 0) throw new Error('photo-sheet not closed');
  html = html.slice(0, start) + html.slice(end);
  fs.writeFileSync(file, html);
  console.log('photo-sheet removed, length', end - start);
}

const open = (html.match(/<div\b/g) || []).length, close = (html.match(/<\/div>/g) || []).length;
console.log('div 总数:', open, close, open === close ? 'OK' : 'MISMATCH');
const labels = [...html.matchAll(/<label for="(meal|chat)-(image|gallery)"/g)].length;
console.log('file-input labels:', labels, labels === 4 ? 'OK' : 'EXPECTED 4');
const map = sectionMap(file);
for (const [id, v] of Object.entries(map)) console.log('  ' + id.padEnd(17), 'len=' + v.length, 'div=' + v.div);
