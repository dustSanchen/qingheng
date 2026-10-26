import fs from 'node:fs';
const files = fs.readdirSync('app/src/main/java/cn/qingheng/health', {recursive: true}).filter(f => f.endsWith('.java'));
for (const f of files) {
  const p = 'app/src/main/java/cn/qingheng/health/' + f.replace(/\\/g, '/');
  const t = fs.readFileSync(p, 'utf8');
  if (t.includes('chatReply') || t.includes('/api/chat')) {
    const hits = [...t.matchAll(/chatReply|\/api\/chat/g)].length;
    console.log(p, 'hits=' + hits);
  }
}
