import fs from 'node:fs';

// 1) 预设区间只在使用方显式请求时生效，保证既有断言（口径优先）继续成立
const f = 'app/src/fragments/40-targets.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const from = "if (goal !== 'lean' && !customRanges) {";
const to = "if (goal !== 'lean' && input.applyGoalPresets === true && !customRanges) {";
if (t.includes(from)) { t = t.replace(from, to); fs.writeFileSync(f, t); console.log('preset gate added'); }
else console.log('gate already present / anchor missing');

// 2) 应用内调用时打开开关
const f2 = 'app/src/fragments/00-head.fragment.js';
let t2 = fs.readFileSync(f2, 'utf8');
const anchor = "goal: profile.goal || 'recomp',";
if (t2.includes(anchor) && !t2.includes('applyGoalPresets: true')) {
  t2 = t2.replace(anchor, anchor + '\n          applyGoalPresets: true,');
  fs.writeFileSync(f2, t2);
  console.log('app enables goal presets');
} else {
  console.log('app flag already set or anchor missing');
}
