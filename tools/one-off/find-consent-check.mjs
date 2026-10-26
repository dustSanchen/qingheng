import fs from 'node:fs';
import path from 'node:path';
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!p.endsWith('.java')) continue;
    const t = fs.readFileSync(p, 'utf8');
    const i = t.indexOf('请先勾选本次发送同意');
    if (i > 0) { console.log(p); console.log(t.slice(Math.max(0,i-600), i+120)); }
  }
}
walk('app/src/main/java');
