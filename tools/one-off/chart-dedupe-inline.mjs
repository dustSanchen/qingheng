import fs from 'node:fs';

const f = 'app/src/fragments/50-onboarding.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const from = 'const values = points.length<=7 ? points.map((item,i) => `<text class="chart-value" x="${coords[i][0]}" y="${coords[i][1]-12}" text-anchor="middle">${fmt(item.weight)}</text>`).join(\'\') : \'\';';
if (!t.includes(from)) { console.log('MISS values line'); process.exit(1); }

const to = [
  '// 相邻同值只标一次（内联判定，不引入外部函数）：连续几天体重相同会把标签叠成一团。',
  'const values = points.length<=7 ? points.map((item,i) => {',
  '  const prev = i > 0 ? fmt(points[i-1].weight) : \'\';',
  '  if (prev === fmt(item.weight)) return \'\';',
  '  return `<text class="chart-value" x="${coords[i][0]}" y="${coords[i][1]-12}" text-anchor="middle">${fmt(item.weight)}</text>`;',
  '}).join(\'\') : \'\';'
].join('\n');

t = t.replace(from, to);
fs.writeFileSync(f, t);
console.log('inline dedupe applied');
