import fs from 'node:fs';
import { sectionMap } from './section-map.mjs';

const file = 'app/src/main/assets/index.html';
const baselineFile = 'build/index.baseline.html';

// 每次都从基线出发，避免多次叠加改坏
let html = fs.readFileSync(baselineFile, 'utf8');
const before = sectionMap(baselineFile);

const start = html.indexOf('<button type="button" class="photo-add"');
if (start < 0) throw new Error('photo-add button not found in baseline');
const end = html.indexOf('</button>', start) + '</button>'.length;
const original = html.slice(start, end);
console.log('original entry length:', original.length);

const cards = '<div class="capture-actions"><label for="meal-image" class="capture-card"><img class="capture-icon" src="./icon-camera.svg" alt="" width="24" height="24"><span>拍照</span></label><label for="meal-gallery" class="capture-card"><img class="capture-icon" src="./icon-gallery.svg" alt="" width="24" height="24"><span>从相册选</span></label></div>';

html = html.slice(0, start) + cards + html.slice(end);
fs.writeFileSync(file, html);

const after = sectionMap(file);
console.log('\n区块差异：');
let changed = 0;
for (const id of Object.keys(before)) {
  const a = before[id], b = after[id];
  if (!b) { console.log('  丢失区块:', id); changed++; continue; }
  if (a.length !== b.length || a.div !== b.div) {
    console.log('  ' + id.padEnd(17), a.length, '->', b.length, '| div', a.div, '->', b.div);
    changed++;
  }
}
console.log('changed sections:', changed, changed === 1 ? '(符合预期)' : '(注意)');
const open = (html.match(/<div\b/g) || []).length, close = (html.match(/<\/div>/g) || []).length;
console.log('div 总数:', open, close, open === close ? 'OK' : 'MISMATCH');
