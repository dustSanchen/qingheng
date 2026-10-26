import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const lines = css.split(/\r?\n/);
let selector = '';
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/\{\s*$/.test(line) && !/^\s*@/.test(line)) selector = line.replace(/\{.*$/, '').trim().slice(0, 60);
  const m = line.match(/font-size:\s*([0-9.]+px)/);
  if (m) {
    const px = parseFloat(m[1]);
    if (px >= 16 || px <= 10.5) console.log(px + 'px  <- ' + selector);
  }
}
