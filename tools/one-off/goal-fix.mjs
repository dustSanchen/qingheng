import fs from 'node:fs';

const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const planFrom = "const plan = profile.goal === 'lean' ? computeTargets({ sex: profile.sex || 'male', weight: number(profile.weight) ?? latestWeight(), height: profile.height, age: profile.age, goal: 'lean', training: profile.training, rules: profile }) : null;";
const planTo = "const plan = computeTargets({ sex: profile.sex || 'male', weight: number(profile.weight) ?? latestWeight(), height: profile.height, age: profile.age, goal: profile.goal || 'recomp', training: profile.training, rules: profile });";
if (t.split(planFrom).length - 1 !== 1) { console.log('plan anchor count:', t.split(planFrom).length - 1); }
else { t = t.replace(planFrom, planTo); console.log('intake plan now computed for every goal'); }

const basisFrom = "`薄肌计划（按维持 ${active.tdee} 与有效缺口 ${active.leanPlan.effectivePercent}%）`";
const basisTo = "`${goalLabel(profile.goal)}（按维持 ${active.tdee}${active.leanPlan ? ' 与有效缺口 ' + active.leanPlan.effectivePercent + '%' : ''}）`";
if (t.includes(basisFrom)) { t = t.replace(basisFrom, basisTo); console.log('basis label generalised'); }

// 目标名映射
if (!t.includes('function goalLabel(')) {
  const anchor = 'function intakeRangeForDate(date = activeDate) {';
  const helper = [
    'function goalLabel(goal) {',
    '    const map = {gain: \'增肌\', cut: \'减脂\', recomp: \'增肌同时减脂\', lean: \'薄肌\', maintain: \'保持身材\'};',
    '    return map[String(goal || \'recomp\')] || \'饮食\';',
    '  }',
    ''
  ].join('\n');
  t = t.replace(anchor, helper + anchor);
  console.log('goalLabel added');
}

fs.writeFileSync(f, t);
