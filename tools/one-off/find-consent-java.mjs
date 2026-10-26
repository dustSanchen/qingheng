import fs from 'node:fs';
import path from 'node:path';
const hits = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!p.endsWith('.java')) continue;
    const t = fs.readFileSync(p, 'utf8');
    t.split(/\r?\n/).forEach((l, i) => { if (/consent/i.test(l)) hits.push(p.split('\\').pop() + ':' + (i+1) + ' ' + l.trim().slice(0,110)); });
  }
}
walk('app/src/main/java');
console.log(hits.slice(0, 12).join('\n'));
