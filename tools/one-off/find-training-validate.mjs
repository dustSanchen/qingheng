import fs from 'node:fs';
import path from 'node:path';
const roots = ['app/src/main/java'];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (p.endsWith('.java')) {
      const t = fs.readFileSync(p, 'utf8');
      if (t.includes('必须是数字') || t.includes('training')) {
        const lines = t.split(/\r?\n/);
        lines.forEach((l, i) => { if (/必须是数字|"training"/.test(l)) console.log(p.replace(/\\/g,'/') + ':' + (i+1) + '  ' + l.trim().slice(0,120)); });
      }
    }
  }
}
walk(roots[0]);
