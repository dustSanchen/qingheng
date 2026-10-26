import fs from 'node:fs';

const files = [
  'C:\\Users\\admin\\AppData\\Local\\Temp\\dsh-spill-s43M86\\session-aeb7a3dd3f04\\a7d2fe590503-web_fetch.txt',
  'C:\\Users\\admin\\AppData\\Local\\Temp\\dsh-spill-s43M86\\session-aeb7a3dd3f04\\a0389e877b84-web_fetch.txt',
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  let data;
  try { data = JSON.parse(text.slice(text.indexOf('{"code"'))); } catch { continue; }
  console.log('=== ' + file.split('\\').pop());
  for (const r of (data.data && data.data.replies) || []) {
    const pics = (r.content && r.content.pictures) || [];
    const msg = (r.content && r.content.message || '').replace(/\s+/g, ' ').slice(0, 40);
    console.log('· ' + r.member.uname + ' [赞' + r.like + '] "' + msg + '" 图片 ' + pics.length);
    for (const p of pics) console.log('   ' + p.img_src.replace(/^http:/, 'https:') + '  ' + p.img_width + 'x' + p.img_height);
    for (const sub of (r.replies || [])) {
      const subPics = (sub.content && sub.content.pictures) || [];
      if (subPics.length) {
        console.log('   - ' + sub.member.uname + ' 图片 ' + subPics.length);
        for (const p of subPics) console.log('     ' + p.img_src.replace(/^http:/, 'https:'));
      }
    }
  }
}
