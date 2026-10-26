import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const lines = css.split(/\r?\n/);
const findSelector = (idx) => {
  for (let i = idx; i >= 0; i--) if (/\{\s*$/.test(lines[i])) return lines[i].replace(/\{\s*$/, '').trim().slice(0, 70);
  return '?';
};
const rows = [];
lines.forEach((line, i) => {
  if (i < 40) return;
  const m = line.match(/font-size:\s*([0-9.]+px)/);
  if (!m) return;
  const px = parseFloat(m[1]);
  if (px >= 16 || px <= 10.5) rows.push(px + 'px <- ' + findSelector(i));
});
console.log(rows.join('\n'));
