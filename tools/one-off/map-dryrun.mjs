import fs from 'node:fs';

const cssPath = 'D:/AI/health-android/app/src/main/assets/styles.css';
const csvPath = 'D:/AI/health-android/docs/design/02-mapping.csv';

const css = fs.readFileSync(cssPath, 'utf8');
const rows = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
const header = rows.shift().split(',');
const idx = name => header.indexOf(name);
const iValue = idx('value'), iTarget = idx('target_token'), iReason = idx('reason');

let plan = [];
let skipped = 0;
for (const line of rows) {
  // 简易 CSV：reason 里有逗号，所以只取前几列
  const parts = line.split(',');
  const value = (parts[iValue] || '').trim();
  const target = (parts[iTarget] || '').trim();
  const reason = line.slice(line.indexOf(target) + target.length).replace(/^,/, '').replace(/^"|"$/g, '');
  if (!/^#[0-9a-fA-F]{3,8}$/.test(value)) { skipped++; continue; }
  if (!/^--[a-z0-9-]+$/.test(target)) { skipped++; continue; }
  if (/待人工|保留|拆/.test(reason)) { skipped++; continue; }
  const re = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const hits = (css.match(re) || []).length;
  if (hits) plan.push({ value, target, hits });
}

const total = plan.reduce((a, b) => a + b.hits, 0);
console.log('可替换色值:', plan.length, '处数:', total, '跳过行:', skipped);
console.log(plan.slice(0, 12).map(p => `${p.value} -> var(${p.target}) ×${p.hits}`).join('\n'));
fs.writeFileSync('D:/AI/health-android/build/mapping-plan.json', JSON.stringify(plan, null, 2));
