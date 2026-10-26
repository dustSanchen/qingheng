import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
const lines = t.split(/\r?\n/);
lines.forEach((line, i) => {
  if (/(还没有|暂无|尚未|没有记录|未记录)/.test(line) && /innerHTML|textContent|'<p|`<p/.test(line)) {
    console.log((i+1) + '  ' + line.trim().slice(0, 150));
  }
});
