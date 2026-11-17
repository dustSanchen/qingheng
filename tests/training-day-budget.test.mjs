/**
 * Step 4 (part 1) checks: the day's own training flag drives which intake range the app uses, and the
 * reminder rules are stated plainly instead of being discoverable only by experiment.
 */
import fs from 'node:fs';
import vm from 'node:vm';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

// --- training day drives the budget -----------------------------------------------------------------
check('an intake range is derived per date', app.includes('function intakeRangeForDate(date = activeDate, profileOverride = null)'));
check('a training day uses the training range', app.includes('min: useTraining ? trainingDay.min : restDay.min'));
check('a rest day uses the rest range', app.includes('max: useTraining ? trainingDay.max : restDay.max'));
// 2026-11-18：训练日不再读手填的「训练情况」，改成「当天有没有保存训练动作」。
check('an unrecorded day says so instead of guessing', app.includes("'当天未记录训练，按休息日区间'"));
check('every diet goal drives the daily range', app.includes("goal: profile.goal,") && app.includes('goalLabel(profile.goal)'));
check('the goal plan falls back safely when incomplete', app.includes('plan && !plan.incomplete ? plan : null'));
check('the training flag is derived from the day\'s exercises', app.includes('const trained = typeof trainedOn === \'function\' ? !!trainedOn(date) : false;') && app.includes('function trainedOn(date)'));
check('and the day is trained when it has a named exercise', app.includes("return exercisesFor(date).some(item => item && String(item.name || '').trim());"));
check('the habit form no longer asks for training status', !html.includes('id="habit-training"') && !html.includes('训练情况'));
check('the effective profile carries the range', app.includes('profile.intakeRange = {min: range.min, max: range.max, basis: range.basis, trained: !!range.trained};'));
check('the stored ceiling is replaced by the day range', app.includes('profile.calorieTarget = range.max;'));
check('the stored day ranges are refreshed from the goal plan', app.includes('profile.trainingDayMin = range.trainingDay.min;'));
check('a one-day adjustment still overrides the ceiling', app.includes('if (adjustment) Object.assign(profile, adjustment.temporary);'));
// 断言更新登记（03-global-changes.md §5.1，2026-10-29）：C 节把区间降级成「目标单值 + ±2% 容差 + 依据」，
// 依据与数字必须同屏同源，所以断言的是一段代码里同时写入两者。
check('the hero shows one target with basis and tolerance', app.includes("$('#calorie-target').textContent = target === null ? '—' : fmt(target, 0);") && app.includes("' · ±2%'"));
check('the caption names the day type from the range', app.includes("range.trained ? '训练日' : '休息日'"));
check('the range carries whether the day is trained', app.includes('profile.intakeRange = {min: range.min, max: range.max, basis: range.basis, trained: !!range.trained};'));
check('the caption separates below-range from over-range', app.includes('距区间下限还差') && app.includes('超出区间上限'));
check('the caption confirms when inside the range', app.includes('在区间内，距上限'));

// --- reminders are stated plainly ---------------------------------------------------------------------
check('the daily cap is stated', app.includes('每天最多 2 条（白天与晚间各一条）'));
check('the minimum gap is stated', app.includes('两次之间至少间隔 3 小时，不会在同一时段连发两条'));
check('the exact-alarm state is stated', app.includes('精确时间${p.canScheduleExact ?'));
check('the notification-permission state is stated', app.includes('通知权限${p.notificationsGranted ?'));
check('the condensed body is explained', app.includes('通知正文会自动精简到一行，展开可看全文'));
check('the extra post-meal reminder is disclosed', app.includes('记录后还会有一次即时反馈（同样计入每日上限）'));

// --- behaviour: the ceilings are what the day type picks ------------------------------------------------
const sandbox = {
  number: v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null),
};
vm.createContext(sandbox);
const rulesSource = app.slice(app.indexOf('const TARGET_RULES = {'), app.indexOf('\n  const GOAL_LABEL'));
vm.runInContext(rulesSource, sandbox);
const targetRules = sandbox.targetRules;
const rules = targetRules({});
// 训练日/休息日的判定已上移到 trainedOn（见上），这里只锁两条区间的大小关系与「不设硬地板」。
check('the training ceiling is above the rest ceiling', rules.trainingDayMax > rules.restDayMax, `${rules.trainingDayMax} > ${rules.restDayMax}`);
check('no default rule carries a hard intake floor', !('intakeFloor' in rules));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
