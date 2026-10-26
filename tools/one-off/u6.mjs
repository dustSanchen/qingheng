import fs from 'node:fs';
const xml = fs.readFileSync('build/u6.xml','utf8');
for (const m of xml.matchAll(/<node[^>]*text="关于轻衡"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)) console.log('关于轻衡', Math.round((+m[1]+ +m[3])/2), Math.round((+m[2]+ +m[4])/2));
for (const m of xml.matchAll(/<node[^>]*text="参考与致谢"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)) console.log('参考与致谢', Math.round((+m[1]+ +m[3])/2), Math.round((+m[2]+ +m[4])/2));
