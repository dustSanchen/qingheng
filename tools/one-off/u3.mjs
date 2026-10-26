import fs from 'node:fs';
const xml = fs.readFileSync('build/u3.xml','utf8');
for (const m of xml.matchAll(/<node[^>]*text="(训练|饮食|身体)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)) {
  console.log(m[1], Math.round((+m[2]+ +m[4])/2), Math.round((+m[3]+ +m[5])/2));
}
