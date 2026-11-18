/**
 * The 薄肌 (lean / defined) goal mode, checked numerically against the user's own data.
 *
 * Runs the shipped computeTargets() in a sandbox rather than re-implementing the maths, so the test
 * fails if the app's numbers and the documented rules ever drift apart.
 */
import fs from 'node:fs';
import vm from 'node:vm';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const source = fs.readFileSync('app/src/fragments/40-targets.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('  const TARGET_RULES = {');
const end = source.indexOf('  /** Onboarding values -> computeTargets input');
if (start < 0 || end < 0) throw new Error('fragment slice markers not found');

const sandbox = {number: v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)), Math, Object, Number, String, Array, Boolean};
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end) + '\nthis.computeTargets = computeTargets; this.GOAL_PRESETS = GOAL_PRESETS; this.GOAL_LABEL = GOAL_LABEL;', sandbox);
const {computeTargets, GOAL_PRESETS, GOAL_LABEL} = sandbox;

const base = {sex: 'male', weight: 64.6, height: 166, age: 24, training: 3};

// --- the established recomp numbers must not move ---------------------------------------------------
const recomp = computeTargets({...base, goal: 'recomp'});
check('recomp ranges stay below TDEE and above zero', recomp.trainingDay.max <= recomp.tdee && recomp.restDay.max <= recomp.tdee && recomp.trainingDay.min > 0,
  `training ${recomp.trainingDay.min}~${recomp.trainingDay.max} / rest ${recomp.restDay.min}~${recomp.restDay.max}`);
check('recomp keeps 2.0~2.4 g/kg protein', recomp.proteinMin === 129 && recomp.proteinMax === 155, `${recomp.proteinMin}~${recomp.proteinMax}`);
check('recomp TDEE unchanged', recomp.tdee === 2157 && recomp.bmr === 1569, `bmr ${recomp.bmr} tdee ${recomp.tdee}`);
check('recomp has no floor key any more', !('floor' in recomp) && !('intakeFloor' in recomp.rules));

// --- the lean preset exists and is named ------------------------------------------------------------
check('a lean preset exists', Boolean(GOAL_PRESETS.lean) && GOAL_PRESETS.lean.deficitPercent === 12);
check('lean has a display label', GOAL_LABEL.lean === '薄肌（线条）');
check('lean raises protein to 2.2~2.6 g/kg', GOAL_PRESETS.lean.proteinPerKgMin === 2.2 && GOAL_PRESETS.lean.proteinPerKgMax === 2.6);

// --- the lean plan on the user's real numbers -------------------------------------------------------
const lean = computeTargets({...base, goal: 'lean'});
check('lean ranges are positive and carb-cycled', lean.trainingDay.min > lean.restDay.max,
  `training ${lean.trainingDay.min}~${lean.trainingDay.max} / rest ${lean.restDay.min}~${lean.restDay.max}`);
check('lean never exceeds the deficit cap', lean.trainingDeficit <= lean.cap && lean.restDeficit <= lean.cap,
  `training ${lean.trainingDeficit}% rest ${lean.restDeficit}% cap ${lean.cap}%`);
check('lean effective deficit tracks the plan', lean.leanPlan.effectivePercent > 8 && lean.leanPlan.effectivePercent <= 12.5,
  `effective ${lean.leanPlan.effectivePercent}%`);
check('lean protein is the higher band', lean.proteinMin >= 142 && lean.proteinMax >= 155, `${lean.proteinMin}~${lean.proteinMax}`);
check('lean fat still clears the hormone floor', lean.fatMin >= 50, `${lean.fatMin}~${lean.fatMax}`);
check('lean predicts a weekly fat loss', lean.leanPlan.weeklyLoss > 0 && lean.leanPlan.weeklyLoss < 0.5, `${lean.leanPlan.weeklyLoss} kg/week`);
check('lean loss rate is inside the muscle-sparing band', lean.leanPlan.lossRatePercent > 0 && lean.leanPlan.lossRatePercent <= 0.7, `${lean.leanPlan.lossRatePercent}%/week`);
check('lean computes a monthly figure', lean.leanPlan.fatPerMonth > 0 && lean.leanPlan.fatPerMonth < 2, `${lean.leanPlan.fatPerMonth} kg/month`);
check('lean warns when the effective deficit is very small', lean.leanPlan.effectivePercent < 8 ? lean.warnings.some(w => w.includes('线条变化会很慢')) : true);
check('lean states the body-fat runway', lean.lines.some(l => l.includes('薄肌（线条）路径')) && lean.lines.some(l => l.includes('体脂跑道')));
check('lean line shows the weekly average deficit', lean.lines.some(l => l.includes('周均')), lean.lines[1]);

// --- each goal actually differs ---------------------------------------------------------------------
const cut = computeTargets({...base, goal: 'cut'});
check('cut is deeper than recomp', cut.trainingDay.max < recomp.trainingDay.max, `${cut.trainingDay.max} < ${recomp.trainingDay.max}`);
check('cut protein is 2.3~2.6 g/kg', cut.proteinPerKgMin === 2.3 && cut.proteinPerKgMax === 2.6, `${cut.proteinPerKgMin}~${cut.proteinPerKgMax}`);
const maintain = computeTargets({...base, goal: 'maintain'});
check('maintain protein is 1.6~2.0 g/kg', maintain.proteinMin === Math.round(64.6 * 1.6) && maintain.proteinMax === Math.round(64.6 * 2.0), `${maintain.proteinMin}~${maintain.proteinMax}`);
check('maintain sits around maintenance', Math.abs(maintain.weeklyAverageDeficit) <= 3, `${maintain.weeklyAverageDeficit}%`);
const gain = computeTargets({...base, goal: 'gain'});
check('gain is a surplus', gain.weeklyAverageDeficit < 0 && gain.trainingDay.max > recomp.trainingDay.max, `${gain.weeklyAverageDeficit}%`);

// --- guards that must not regress --------------------------------------------------------------------
const unset = computeTargets({...base, goal: 'lean', training: null});
check('a missing training plan is reported, not assumed silently', unset.provisional === true && unset.warnings.some(w => w.includes('还没有训练计划')));
const noWeight = computeTargets({sex: 'male', height: 166, age: 24, training: 3, goal: 'lean'});
check('missing weight still blocks the estimate', noWeight.incomplete === true && noWeight.missing.includes('体重'));

check('the hub summary knows the 薄肌 label', fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8').includes('GOAL_LABEL[profile.goal]'));
check('the hub summary uses the goal-aware range', fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8').includes('const range = intakeRangeForDate();'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
