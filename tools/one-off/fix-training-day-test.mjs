/**
 * The daily range moved to a goal-aware shape, so these assertions follow the implementation and gain
 * one check that the 薄肌 plan is what drives the day when that goal is selected.
 */
import {patch} from '../lib/patch.mjs';

patch('tests/training-day-budget.test.mjs', [
  [
    'training range assertion',
    "check('a training day uses the training range', app.includes('min: useTraining ? rules.trainingDayMin : rules.restDayMin'));",
    "check('a training day uses the training range', app.includes('min: useTraining ? trainingDay.min : restDay.min'));",
  ],
  [
    'rest range assertion',
    "check('a rest day uses the rest range', app.includes('max: useTraining ? rules.trainingDayMax : rules.restDayMax'));",
    "check('a rest day uses the rest range', app.includes('max: useTraining ? trainingDay.max : restDay.max'));",
  ],
  [
    'unrecorded day assertion',
    `check('an unrecorded day says so instead of guessing', app.includes("basis: trained === null ? '当天未记录是否训练，按休息日区间'"));`,
    `check('an unrecorded day says so instead of guessing', app.includes("'当天未记录是否训练，按休息日区间'"));
check('the 薄肌 goal drives the daily range', app.includes("profile.goal === 'lean'") && app.includes('薄肌计划（按维持'));
check('the goal plan falls back safely when incomplete', app.includes('plan && !plan.incomplete ? plan : null'));`,
  ],
]);

console.log('training-day assertions updated');
