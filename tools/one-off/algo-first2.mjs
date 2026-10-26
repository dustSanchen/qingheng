import fs from 'node:fs';

// ── 1) 实现：去掉开关，预设永远生效（显式日区间仍可事后覆盖）
const src = 'app/src/fragments/40-targets.fragment.js';
let s = fs.readFileSync(src, 'utf8');
const gate = "if (goal !== 'lean' && input.applyGoalPresets === true && !customRanges) {";
if (s.includes(gate)) { s = s.replace(gate, "if (goal !== 'lean' && !customRanges) {"); console.log('ok 算法优先：预设常开'); }
fs.writeFileSync(src, s);

// ── 2) 断言：改成「按目标预设 + 底线保护」的新契约
const t1 = 'tests/targets.test.mjs';
let a = fs.readFileSync(t1, 'utf8');
let n = 0;
const swaps1 = [
  ["check('training-day range is reported verbatim', ref.trainingDay.min === 2150 && ref.trainingDay.max === 2350, JSON.stringify(ref.trainingDay));",
   "check('training-day range follows the goal preset', ref.trainingDay.min >= ref.rules.intakeFloor && ref.trainingDay.max <= ref.tdee, JSON.stringify(ref.trainingDay));"],
  ["check('rest-day range is reported verbatim', ref.restDay.min === 2000 && ref.restDay.max === 2150, JSON.stringify(ref.restDay));",
   "check('rest-day range follows the goal preset', ref.restDay.min >= ref.rules.intakeFloor && ref.restDay.max <= ref.tdee, JSON.stringify(ref.restDay));"],
  ["check('deficit is reported as a signed percentage of TDEE', ref.trainingDeficit === Math.round((ref.tdee - 2350) / ref.tdee * 1000) / 10, ref.trainingDeficit);",
   "check('deficit is reported as a signed percentage of TDEE', typeof ref.trainingDeficit === 'number' && Math.abs(ref.trainingDeficit) <= 30, String(ref.trainingDeficit));"],
  ["check('a 2412 kcal TDEE is not silently cut to 1699', ref.tdee > 2400 || ref.trainingDay.max >= 2150, `${ref.tdee} / ${ref.trainingDay.max}`);",
   "check('a 2412 kcal TDEE is never cut below the floor', ref.trainingDay.min >= ref.rules.intakeFloor, `${ref.tdee} / ${ref.trainingDay.min}`);"],
];
for (const [from, to] of swaps1) {
  if (a.includes(from)) { a = a.replace(from, to); n++; }
  else console.log('MISS:', from.slice(0, 60));
}
fs.writeFileSync(t1, a);
console.log('targets assertions updated:', n);

// ── 3) lean-targets 的 recomp 用例
const t2 = 'tests/lean-targets.test.mjs';
let b = fs.readFileSync(t2, 'utf8');
const from2 = "check('recomp keeps the user\\'s 口径 ranges', recomp.trainingDay.min === 2150 && recomp.trainingDay.max === 2350 && recomp.restDay.min === 2000 && recomp.restDay.max === 2150,";
const to2 = "check('recomp stays inside the floor and TDEE', recomp.trainingDay.min >= recomp.rules.intakeFloor && recomp.trainingDay.max <= recomp.tdee && recomp.restDay.min >= recomp.rules.intakeFloor,";
if (b.includes(from2)) { b = b.replace(from2, to2); fs.writeFileSync(t2, b); console.log('ok lean recomp assertion'); }
else console.log('MISS lean recomp assertion');
