import fs from 'node:fs';
const dir = 'app/src/fragments';
for (const f of fs.readdirSync(dir)) {
  const t = fs.readFileSync(dir + '/' + f, 'utf8');
  if (t.includes('还没有足够的训练记录')) console.log(f, 'has training empty call');
  if (t.includes('render-error')) {
    const i = t.indexOf('render-error');
    console.log(f, 'render-error ctx:', t.slice(Math.max(0,i-200), i+200).replace(/\s+/g,' ').slice(0,360));
  }
}
