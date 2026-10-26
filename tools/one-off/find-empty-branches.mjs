import fs from 'node:fs';
const files = fs.readdirSync('app/src/fragments');
for (const f of files) {
  const t = fs.readFileSync('app/src/fragments/' + f, 'utf8');
  const lines = t.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/(answers\.length|messages\.length|rows\.length|points\.length|!list\.length|days\.length)/.test(line) && /innerHTML|textContent|= /.test(line)) {
      console.log(f + ':' + (i+1) + '  ' + line.trim().slice(0, 150));
    }
  });
}
