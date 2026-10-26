import fs from 'node:fs';
const xml = fs.readFileSync('build/u4.xml','utf8');
const i = xml.indexOf('ACWR');
console.log('ACWR in ui:', i > 0);
for (const m of xml.matchAll(/<node[^>]*text="([^"]{0,12}ACWR[^"]{0,20})"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)) {
  console.log(JSON.stringify(m[1]), Math.round((+m[2]+ +m[4])/2), Math.round((+m[3]+ +m[5])/2));
}
