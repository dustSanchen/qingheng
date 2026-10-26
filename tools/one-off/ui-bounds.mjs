import fs from 'node:fs';
const xml = fs.readFileSync('build/ui.xml', 'utf8');
for (const m of xml.matchAll(/<node[^>]*text="(趋势|饮食|今天|记录|问答|我的)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)) {
  const [, label, x1, y1, x2, y2] = m;
  console.log(label, 'center=', Math.round((+x1 + +x2)/2), Math.round((+y1 + +y2)/2));
}
