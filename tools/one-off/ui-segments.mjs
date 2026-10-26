import fs from 'node:fs';
const xml = fs.readFileSync('build/ui2.xml', 'utf8');
for (const m of xml.matchAll(/<node[^>]*text="(体重|饮食|训练)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)) {
  const [, label, x1, y1, x2, y2] = m;
  console.log(label, 'center=', Math.round((+x1 + +x2)/2), Math.round((+y1 + +y2)/2));
}
