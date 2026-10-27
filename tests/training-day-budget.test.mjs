/**
 * Step 4 (part 1) checks: the day's own training flag drives which intake range the app uses, and the
 * reminder rules are stated plainly instead of being discoverable only by experiment.
 */
import fs from 'node:fs';
import vm from 'node:vm';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

// --- training day drives the budget -----------------------------------------------------------------
check('an intake range is derived per date', app.includes('function intakeRangeForDate(date = activeDate)'));
check('a training day uses the training range', app.includes('min: useTraining ? trainingDay.min : restDay.min'));
check('a rest day uses the rest range', app.includes('max: useTraining ? trainingDay.max : restDay.max'));
check('an unrecorded day says so instead of guessing', app.includes("'当天未记录是否训练，按休息日区间'"));
check('every diet goal drives the daily range', app.includes("goal: profile.goal,") && app.includes('goalLabel(profile.goal)'));
check('the goal plan falls back safely when incomplete', app.includes('plan && !plan.incomplete ? plan : null'));
check('the training flag is read from the habit row', app.includes("const habit = (state?.habits || []).find(row => row && row.date === date);"));
check('a string "true" from older data is accepted', app.includes("habit.training === 'true' ? true"));
check('the effective profile carries the range', app.includes('profile.intakeRange = {min: range.min, max: range.max, basis: range.basis};'));
check('the stored ceiling is replaced by the day range', app.includes('if (hasRules) profile.calorieTarget = range.max;'));
check('old data without rules keeps working', app.includes('const hasRules = number(state?.profile?.trainingDayMax) !== null'));
check('a one-day adjustment still overrides the ceiling', app.includes('if (adjustment) Object.assign(profile, adjustment.temporary);'));
check('the hero shows a range, not a single number', app.includes("$('#calorie-target').textContent = range ? `${fmt(range.min,0)}~${fmt(range.max,0)}` : fmt(p.calorieTarget,0);"));
check('the caption explains what the range is based on', app.includes('按${range.basis.startsWith(\'当天标记为训练\') ? \'训练日\' : \'休息日\'}区间：'));
check('the caption separates below-range from over-range', app.includes('距区间下限还差') && app.includes('超出区间上限'));
check('the caption confirms when inside the range', app.includes('在区间内，距上限'));

// --- reminders are stated plainly ---------------------------------------------------------------------
check('the daily cap is stated', app.includes('每天最多 2 条（白天与晚间各一条）'));
check('the minimum gap is stated', app.includes('两次之间至少间隔 3 小时，不会在同一时段连发两条'));
check('the exact-alarm state is stated', app.includes('精确时间${p.canScheduleExact ?'));
check('the notification-permission state is stated', app.includes('通知权限${p.notificationsGranted ?'));
check('the condensed body is explained', app.includes('通知正文会自动精简到一行，展开可看全文'));
check('the extra post-meal reminder is disclosed', app.includes('记录后还会有一次即时反馈（同样计入每日上限）'));

// --- behaviour: the range really follows the flag ------------------------------------------------------
const sandbox = {
  number: v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null),
};
vm.createContext(sandbox);
const rulesSource = app.slice(app.indexOf('const TARGET_RULES = {'), app.indexOf('\n  const GOAL_LABEL'));
vm.runInContext(rulesSource, sandbox);
const targetRules = sandbox.targetRules;
const rules = targetRules({});
const pick = (habits, date) => {
  const habit = habits.find(row => row && row.date === date);
  const trained = habit ? (habit.training === true || habit.training === 'true' ? true : habit.training === false || habit.training === 'false' ? false : null) : null;
  return trained === true ? rules.trainingDayMax : rules.restDayMax;
};
check('a trained day budgets to the training ceiling', pick([{date: '2026-10-17', training: true}], '2026-10-17') === rules.trainingDayMax);
check('a rest day budgets to the rest ceiling', pick([{date: '2026-10-17', training: false}], '2026-10-17') === rules.restDayMax);
check('an unrecorded day falls back to the rest ceiling', pick([], '2026-10-17') === rules.restDayMax);
check('the training ceiling is above the rest ceiling', rules.trainingDayMax > rules.restDayMax, `${rules.trainingDayMax} > ${rules.restDayMax}`);
check('every range stays above the hard floor', rules.restDayMin >= rules.intakeFloor && rules.trainingDayMin >= rules.intakeFloor);

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
