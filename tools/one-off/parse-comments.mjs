import fs from 'node:fs';

const files = [
  'C:\\Users\\admin\\AppData\\Local\\Temp\\dsh-spill-s43M86\\session-aeb7a3dd3f04\\a7d2fe590503-web_fetch.txt',
  'C:\\Users\\admin\\AppData\\Local\\Temp\\dsh-spill-s43M86\\session-aeb7a3dd3f04\\a0389e877b84-web_fetch.txt',
];
const ups = {2100737396: '凯圣王', 521903482: '谭成义', 2078781964: '好人松松', 1681952786: 'ALEX'};

for (const file of files) {
  if (!fs.existsSync(file)) { console.log('missing', file); continue; }
  const text = fs.readFileSync(file, 'utf8');
  let data;
  try { data = JSON.parse(text.slice(text.indexOf('{"code"'))); } catch (e) { console.log('parse fail', file); continue; }
  const replies = (data.data && data.data.replies) || [];
  console.log('\n=== ' + file.split('\\').pop() + ' · 顶级评论 ' + replies.length + ' 条');
  for (const r of replies) {
    const msg = (r.content && r.content.message || '').replace(/\s+/g, ' ').slice(0, 70);
    console.log('· [赞' + r.like + '] ' + r.member.uname + '：' + msg);
    for (const sub of (r.replies || [])) {
      const subMsg = (sub.content && sub.content.message || '').replace(/\s+/g, ' ').slice(0, 70);
      const flag = ups[Number(sub.member.mid)] ? '  <<< UP主回复(' + ups[Number(sub.member.mid)] + ')' : '';
      console.log('    - ' + sub.member.uname + '：' + subMsg + flag);
    }
  }
}
