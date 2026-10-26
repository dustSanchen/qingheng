import fs from 'node:fs';

const f = 'app/src/fragments/50-onboarding.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const broken = '${sameLabelNeeded(i) ? `<text class="chart-value" x="${coords[i][0]}" y="${coords[i][1]-12}" text-anchor="middle">${fmt(item.weight)}</text>` : ""}';
const fixed = '<text class="chart-value" x="${coords[i][0]}" y="${coords[i][1]-12}" text-anchor="middle">${fmt(item.weight)}</text>';
if (t.includes(broken)) { t = t.replace(broken, fixed); console.log('reverted the label template'); }

// 移除孤立 helper
t = t.replace(/\/\/ 相邻同值只标一次[\s\S]*?const sameLabelNeeded = [^\n]*\n/, '');
fs.writeFileSync(f, t);
console.log('sameLabelNeeded left:', (t.match(/sameLabelNeeded/g) || []).length);
