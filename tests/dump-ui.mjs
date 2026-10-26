import fs from 'node:fs';
const xml = fs.readFileSync('artifacts/device/ui.xml', 'utf8');
const nodes = [...xml.matchAll(/<node[^>]*>/g)].map(m => m[0]);
const found = [];
for (const node of nodes) {
  const text = (node.match(/text="([^"]*)"/) || [, ''])[1];
  const desc = (node.match(/content-desc="([^"]*)"/) || [, ''])[1];
  const bounds = node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!bounds) continue;
  const [, x1, y1, x2, y2] = bounds.map(Number);
  const label = (text || desc || '').trim();
  if (!label) continue;
  found.push({ label, cx: Math.round((x1 + x2) / 2), cy: Math.round((y1 + y2) / 2), box: `${x1},${y1},${x2},${y2}` });
}
console.log('labeled nodes:', found.length);
for (const n of found) console.log(n.label.padEnd(28), 'center', String(n.cx).padStart(5), String(n.cy).padStart(5), ' box', n.box);
const want = ['今天', '记录', '问答', '趋势', '我的'];
console.log('\n--- bottom navigation ---');
for (const w of want) {
  const hit = found.filter(n => n.label === w);
  if (hit.length) console.log(w, '->', hit.map(h => `${h.cx},${h.cy}`).join(' | '));
  else console.log(w, '-> NOT FOUND in the accessibility tree');
}
