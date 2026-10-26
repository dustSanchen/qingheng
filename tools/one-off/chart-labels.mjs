import fs from 'node:fs';

const f = 'app/src/fragments/50-onboarding.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const from = '<text class="chart-value" x="${coords[i][0]}" y="${coords[i][1]-12}" text-anchor="middle">${fmt(item.weight)}</text>';
if (!t.includes(from)) { console.log('MISS chart-value'); process.exit(1); }

const to = '${sameLabelNeeded(i) ? `<text class="chart-value" x="${coords[i][0]}" y="${coords[i][1]-12}" text-anchor="middle">${fmt(item.weight)}</text>` : ""}';
t = t.replace(from, to);

const anchor = 'const weights = points.map(item => Number(item.weight));';
if (!t.includes('sameLabelNeeded')) {
  const helper = [
    '// 相邻同值只标一次：否则连续几天同体重会把标签叠成一团。',
    'const labelTexts = points.map(item => String(Math.round(Number(item.weight) * 10) / 10));',
    'const sameLabelNeeded = index => index === 0 || index === points.length - 1 || labelTexts[index] !== labelTexts[index - 1];',
    ''
  ].join('\n');
  t = t.replace(anchor, helper + anchor);
}

fs.writeFileSync(f, t);
console.log('chart labels deduped');
