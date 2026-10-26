import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
const map = { '--ink': '#1e1e1a', '--muted': '#6b6a63', '--line': '#e8e5dc', '--surface': '#fffefb', '--paper': '#faf8f2' };
let changed = 0;
for (const [name, value] of Object.entries(map)) {
  const re = new RegExp('(' + name + '\\s*:\\s*)(#[0-9a-fA-F]{3,8})');
  if (re.test(css)) { css = css.replace(re, '$1' + value); changed++; }
}
fs.writeFileSync(f, css);
for (const m of css.matchAll(/^\s*(--(?:ink|muted|line|surface|paper|accent)):\s*([^;]+);/gm)) console.log(m[1] + ': ' + m[2]);
console.log('tokens changed:', changed);
