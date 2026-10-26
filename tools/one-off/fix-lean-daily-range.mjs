/**
 * One story, not two: with the 薄肌 goal the daily range must come from the goal plan (derived from
 * TDEE), not from the 口径 ranges that were written for the recomp phase. Otherwise the app shows
 * 2,150~2,350 on the 今天 page while the plan says 2,000~2,121.
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/00-head.fragment.js', [
  [
    'lean-aware daily range',
    `  /** The intake range that applies to a date, and where the answer came from. */
  function intakeRangeForDate(date = activeDate) {
    const profile = state?.profile || {}, rules = targetRules(profile);
    const habit = (state?.habits || []).find(row => row && row.date === date);
    const trained = habit ? (habit.training === true || habit.training === 'true' ? true : habit.training === false || habit.training === 'false' ? false : null) : null;
    const useTraining = trained === true;
    return {
      min: useTraining ? rules.trainingDayMin : rules.restDayMin,
      max: useTraining ? rules.trainingDayMax : rules.restDayMax,
      trained,
      basis: trained === null ? '当天未记录是否训练，按休息日区间' : useTraining ? '当天标记为训练日' : '当天标记为休息日',
      trainingDay: {min: rules.trainingDayMin, max: rules.trainingDayMax},
      restDay: {min: rules.restDayMin, max: rules.restDayMax},
      floor: rules.intakeFloor
    };
  }`,
    `  /**
   * The intake range that applies to a date, and where the answer came from.
   *
   * A goal that derives its own plan (薄肌) wins over the 口径 ranges, because those were written for
   * the recomp phase; showing both would leave the daily page and the plan disagreeing.
   */
  function intakeRangeForDate(date = activeDate) {
    const profile = state?.profile || {}, rules = targetRules(profile);
    const habit = (state?.habits || []).find(row => row && row.date === date);
    const trained = habit ? (habit.training === true || habit.training === 'true' ? true : habit.training === false || habit.training === 'false' ? false : null) : null;
    const useTraining = trained === true;
    const plan = profile.goal === 'lean'
      ? computeTargets({
          sex: profile.sex || 'male',
          weight: number(profile.weight) ?? latestWeight(),
          height: profile.height,
          age: profile.age,
          goal: 'lean',
          training: profile.training,
          rules: profile
        })
      : null;
    const active = plan && !plan.incomplete ? plan : null;
    const trainingDay = active ? active.trainingDay : {min: rules.trainingDayMin, max: rules.trainingDayMax};
    const restDay = active ? active.restDay : {min: rules.restDayMin, max: rules.restDayMax};
    const basis = active
      ? \`薄肌计划（按维持 \${active.tdee} 与有效缺口 \${active.leanPlan.effectivePercent}%）\`
      : trained === null ? '当天未记录是否训练，按休息日区间' : useTraining ? '当天标记为训练日' : '当天标记为休息日';
    return {
      min: useTraining ? trainingDay.min : restDay.min,
      max: useTraining ? trainingDay.max : restDay.max,
      trained,
      basis,
      trainingDay,
      restDay,
      floor: rules.intakeFloor
    };
  }`,
  ],
]);

console.log('daily range is now goal-aware');
