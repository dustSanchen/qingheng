import fs from 'node:fs';
const files = fs.readdirSync('app/src/fragments');
for (const f of files) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  const lines = t.split(/\r?\n/);
  lines.forEach((line, i) => {
    const isRender = /innerHTML|textContent|insertAdjacent|=\s*`|=\s*'/.test(line);
    const isEmptyish = /(还没有|暂无|没有可|尚未|未记录|没有足够|没有内容)/.test(line);
    if (isRender && isEmptyish && !/empty\(/.test(line)) {
      console.log(f + ':' + (i+1) + '  ' + line.trim().slice(0, 140));
    }
  });
}
