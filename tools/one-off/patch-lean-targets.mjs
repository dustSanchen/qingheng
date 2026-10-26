/*
 * 薄肌（线条）目标模式:
 *  - GOAL_PRESETS 给每个目标一个计划缺口与蛋白带，口径（硬底线/缺口上限/脂肪下限）仍是硬约束；
 *  - lean 目标用 TDEE 推导训练日/休息日区间并夹到口径内，同时算出"受硬底线限制"这件事本身；
 *  - 输出每周可减脂肪速率与体脂跑道，避免用户拿一个区间当目标却不看速度。
 */
import fs from 'node:fs';

const file = 'app/src/fragments/40-targets.fragment.js';
let text = fs.readFileSync(file, 'utf8');
const crlf = text.includes('\r\n');
const norm = s => (crlf ? s.replace(/\r\n/g, '\n') : s);
if (crlf) text = norm(text);

const start = '    const floor = rules.intakeFloor;';
const endMarker = '  const GOAL_LABEL =';
const startAt = text.indexOf(start);
const endAt = text.indexOf(endMarker);
if (startAt < 0 || endAt < 0 || endAt < startAt) throw new Error('anchors not found');

const replacement = `    const floor = rules.intakeFloor;
    // Goal presets: the deficit each goal plans and the protein band it needs. The 口径 stays a hard
    // constraint — a preset can never push intake below the floor or past the deficit cap.
    const preset = GOAL_PRESETS[goal] || GOAL_PRESETS.recomp;
    const cap = rules.deficitCapPercent;
    const deficitOf = value => Math.round((tdee - value) / tdee * 1000) / 10;

    let trainingDay = {min: Math.max(floor, rules.trainingDayMin), max: Math.max(floor, rules.trainingDayMax)};
    let restDay = {min: Math.max(floor, rules.restDayMin), max: Math.max(floor, rules.restDayMax)};
    let proteinPerKgMin = rules.proteinPerKgMin;
    let proteinPerKgMax = rules.proteinPerKgMax;
    let leanPlan = null;
    if (goal === 'lean') {
      // The floor is what usually binds: a 2,157 kcal maintenance with a 2,000 kcal floor allows at most
      // a ~7% deficit, so the plan must say so instead of pretending a 12% cut is available.
      const floorPercent = Math.max(0, Math.round((tdee - floor) / tdee * 1000) / 10);
      const effectivePercent = Math.max(0, Math.round(Math.min(preset.deficitPercent, cap, floorPercent) * 10) / 10);
      const centre = tdee * (1 - effectivePercent / 100);
      trainingDay = {min: Math.max(floor, Math.round(centre * 0.98)), max: Math.max(floor, Math.round(centre * 1.04))};
      restDay = {min: Math.max(floor, Math.round(centre * 0.92)), max: Math.max(floor, Math.round(centre * 0.97))};
      proteinPerKgMin = Math.max(rules.proteinPerKgMin, preset.proteinPerKgMin);
      proteinPerKgMax = Math.max(rules.proteinPerKgMax, preset.proteinPerKgMax);
      const weeklyLoss = Math.round(effectivePercent / 100 * tdee * 7 / 7700 * 100) / 100;
      leanPlan = {
        plannedPercent: preset.deficitPercent,
        effectivePercent,
        floorPercent,
        weeklyLoss,
        limitedByFloor: floorPercent < preset.deficitPercent,
        lossRatePercent: w > 0 ? Math.round(weeklyLoss / w * 1000) / 10 : null,
        fatPerMonth: Math.round(weeklyLoss * 4.3 * 10) / 10
      };
    }
    const proteinMin = Math.round(w * proteinPerKgMin);
    const proteinMax = Math.round(w * proteinPerKgMax);
    const proteinMid = Math.round(w * (proteinPerKgMin + proteinPerKgMax) / 2);
    const fatMin = Math.round(Math.max(rules.fatFloorG, rules.fatIdealMinG));
    const fatMax = Math.round(Math.max(fatMin, rules.fatIdealMaxG));
    const fatMid = Math.round((fatMin + fatMax) / 2);
    const budget = trainingDay.max;
    const carbs = Math.max(0, Math.round((budget - proteinMid * 4 - fatMid * 9) / 4));
    const trainingDeficit = deficitOf(trainingDay.max);
    const restDeficit = deficitOf(restDay.max);
    const weeklyAverage = Math.round((trainingDay.max * 4 + restDay.max * 3) / 7);
    const weeklyAverageDeficit = deficitOf(weeklyAverage);
    const warnings = [];
    if (rules.trainingDayMin < floor || rules.restDayMin < floor) warnings.push(\`已把低于 \${floor} kcal 的目标抬到硬底线上（口径：日摄入 ≥ \${floor}）\`);
    if (trainingDeficit > cap) warnings.push(\`训练日缺口 \${trainingDeficit}% 超过口径上限 \${cap}%；要么降目标，要么把缺口上限调高并说明理由\`);
    if (restDeficit > cap) warnings.push(\`休息日缺口 \${restDeficit}% 超过口径上限 \${cap}%\`);
    if (trainingDeficit < 0) warnings.push(\`训练日目标上限比维持热量高 \${Math.abs(trainingDeficit)}%（盈余）\`);
    if (goal === 'cut' && trainingDeficit <= 0) warnings.push('目标是减脂，但当前区间不低于维持热量，减脂期不会有效果');
    if (goal === 'gain' && trainingDeficit > 10) warnings.push('目标是增肌，但当前缺口偏大，增肌原料可能不足');
    if (fatMin < 40) warnings.push('脂肪下限低于 40 g 会影响激素水平（口径：≥ 50 g，理想 55~70 g）');
    if (trainingUnset) warnings.push('每周训练次数未填，暂按久坐（系数 1.2）估算；填好后重新测算才准确');
    if (leanPlan) {
      if (leanPlan.limitedByFloor) warnings.push(\`薄肌计划想要 \${leanPlan.plannedPercent}% 的缺口，但硬底线 \${floor} kcal 把可用缺口压到 \${leanPlan.floorPercent}%（约每周 -\${leanPlan.weeklyLoss} kg）。想更快只有三条路：提高维持热量（增肌/加日常活动）、延长周期、或经你确认后下调硬底线\`);
      if (leanPlan.effectivePercent < 8) warnings.push(\`有效缺口只有 \${leanPlan.effectivePercent}%，线条变化会很慢（每月约 -\${leanPlan.fatPerMonth} kg 脂肪）；这是硬底线的直接后果，不是执行不力\`);
      if (leanPlan.lossRatePercent !== null && leanPlan.lossRatePercent > 0.7) warnings.push(\`每周减重 \${leanPlan.lossRatePercent}% 体重，超过保肌的安全上限 0.5~0.7%/周；薄肌要慢，快减必掉肌肉\`);
    }
    const lines = [
      \`维持热量（TDEE）：约 \${tdee} kcal／天（基础代谢 \${bmr} × 活动系数 \${factor}\${trainingUnset ? '（训练次数未填，按久坐）' : \`，按每周 \${sessions} 次训练\`}）\`,
      \`目标摄入：训练日 \${trainingDay.min}~\${trainingDay.max} kcal／天；休息日 \${restDay.min}~\${restDay.max} kcal／天（周均 \${weeklyAverage}，相当于缺口 \${weeklyAverageDeficit}%）\`,
      \`与维持热量相比：训练日缺口 \${trainingDeficit}%，休息日缺口 \${restDeficit}%（口径：缺口 ≤ 维持的 \${cap}%，摄入 ≥ \${floor} kcal）\`,
      \`蛋白质：\${proteinMin}~\${proteinMax} g（\${proteinPerKgMin}~\${proteinPerKgMax} g/kg）· 脂肪：\${fatMin}~\${fatMax} g（不低于 \${rules.fatFloorG} g）\`,
      \`碳水：约 \${carbs} g（按训练日上限 \${budget} kcal 推算剩余热量）\`
    ];
    if (leanPlan) {
      lines.push(
        \`薄肌（线条）路径：计划缺口 \${leanPlan.plannedPercent}%，实际按 \${leanPlan.effectivePercent}% 执行 → 预计每周 -\${leanPlan.weeklyLoss} kg（约 \${leanPlan.fatPerMonth} kg 脂肪/月，占体重 \${leanPlan.lossRatePercent}%）\`,
        \`体脂跑道：男性 12~15% 可见腹肌线条；每减 1 kg 脂肪约需 \${leanPlan.weeklyLoss > 0 ? Math.round(1 / leanPlan.weeklyLoss) : '—'} 周，按此速度 2 kg 脂肪约 \${leanPlan.weeklyLoss > 0 ? Math.round(2 / leanPlan.weeklyLoss) : '—'} 周\`
      );
    }
    return {
      incomplete: false, goal, goalLabel: GOAL_LABEL[goal] || '增肌同时减脂', rules, preset,
      bmr, factor, tdee, sessions, trainingUnset,
      trainingDay, restDay, floor, cap,
      proteinMin, proteinMax, proteinMid, proteinPerKgMin, proteinPerKgMax,
      fatMin, fatMax, fatMid, carbs, budget,
      trainingDeficit, restDeficit, weeklyAverage, weeklyAverageDeficit, leanPlan,
      warnings,
      provisional: trainingUnset,
      lines
    };
  }
`;

text = text.slice(0, startAt) + replacement + text.slice(endAt);
if (crlf) text = text.replace(/\n/g, '\r\n');
fs.writeFileSync(file, text);
console.log('computeTargets rewritten with the 薄肌 preset');
