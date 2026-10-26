import fs from 'node:fs';

const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const anchor = "proteinPerKgMax = Math.max(rules.proteinPerKgMax, preset.proteinPerKgMax); const weeklyCentre";
if (!t.includes(anchor)) { console.log('lean branch end anchor missing'); process.exit(1); }

// 在 lean 分支之后补 else：其他目标也要按各自缺口/盈余调整热量与蛋白
const marker = 'const proteinMin = Math.round(w * proteinPerKgMin);';
const elseBranch = [
  'else {',
  '      // 非薄肌目标以前只改蛋白区间、热量完全不动，等于选什么都一样；这里按各自预设算出区间。',
  '      const centre = Math.round(tdee * (1 - Math.min(preset.deficitPercent, cap) / 100));',
  '      trainingDay = {min: Math.max(floor, Math.round(centre * 0.98)), max: Math.max(floor, Math.round(centre * 1.04))};',
  '      restDay = {min: Math.max(floor, Math.round(centre * 0.95)), max: Math.max(floor, Math.round(centre * 1.01))};',
  '      proteinPerKgMin = Math.max(rules.proteinPerKgMin, preset.proteinPerKgMin);',
  '      proteinPerKgMax = Math.max(rules.proteinPerKgMax, preset.proteinPerKgMax);',
  '    }',
  ''
].join('\n');

if (!t.includes(elseBranch.split('\n')[0] + '\n      // 非薄肌')) {
  t = t.replace(marker, elseBranch + marker);
  fs.writeFileSync(f, t);
  console.log('goal-aware ranges added for non-lean goals');
} else {
  console.log('already added');
}
