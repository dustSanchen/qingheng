import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const start = html.indexOf('id="view-today"');
const end = html.indexOf('id="view-records"');
const seg = html.slice(start, end);
// 列出每个 article 的起止位置与标题
const re = /<article class="card([^"]*)"[^>]*>/g;
let m; const marks = [];
while ((m = re.exec(seg))) {
  const title = (seg.slice(m.index, m.index + 300).match(/<h2[^>]*>([^<]{1,20})/) || [])[1] || '?';
  marks.push({pos: m.index, title});
}
for (let i = 0; i < marks.length; i++) {
  const startPos = marks[i].pos;
  const endPos = seg.indexOf('</article>', startPos) + 10;
  console.log(i + ': ' + marks[i].title + '  [' + startPos + '-' + endPos + ']  ' + (endPos - startPos) + ' chars');
}
console.log('segment total:', seg.length);
console.log('tail after last card:', JSON.stringify(seg.slice(marks[marks.length-1].pos).slice(-80)));
