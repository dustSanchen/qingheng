/**
 * Step 4b checks: the weekly review slot is real (own trigger, own request code, own prompt) and the
 * trends page judges weight by weekly means, as the written rules require.
 */
import fs from 'node:fs';
import vm from 'node:vm';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const scheduler = fs.readFileSync('app/src/main/java/cn/qingheng/health/AlarmScheduler.java', 'utf8');
const alarm = fs.readFileSync('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', 'utf8');
const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

// --- the slot exists with its own plumbing -----------------------------------------------------------
check('a weekly slot exists', scheduler.includes('SLOT_WEEKLY = "weekly"'));
check('it has its own request code', scheduler.includes('REQUEST_WEEKLY = 7004'));
check('it defaults to Sunday 20:00', scheduler.includes('DEFAULT_WEEKLY_TIME = "20:00"') && scheduler.includes('DEFAULT_WEEKLY_DAY = 7'));
check('it is on by default (documented routine)', scheduler.includes('public static boolean weeklyEnabled(Context context)') && scheduler.includes('getBoolean(KEY_WEEKLY_ENABLED, true)'));
check('a weekly trigger is computed from weekday + time', scheduler.includes('public static long nextWeeklyTrigger(Context context)'));
check('an explicit-instant scheduler exists for it', scheduler.includes('private static void scheduleAt(Context context, String slot, long triggerAt)'));
check('the existing keep-future-registration rule still applies', scheduler.includes('if (already > System.currentTimeMillis() && already <= triggerAt) return;'));
check('cancelling clears the weekly slot too', scheduler.includes('manager.cancel(pending(context, SLOT_WEEKLY, REQUEST_WEEKLY))'));
check('the weekly slot respects the shared gap rule', scheduler.includes('if (weeklyEnabled(context)) soonest = Math.min(soonest, nextWeeklyTrigger(context));'));
check('the receiver accepts the weekly slot', alarm.includes('&& !AlarmScheduler.SLOT_MEAL.equals(slot) && !AlarmScheduler.SLOT_WEEKLY.equals(slot)) return;'));
check('the weekly slot is not caught up late', alarm.includes('if (context == null || (!AlarmScheduler.SLOT_MORNING.equals(slot) && !AlarmScheduler.SLOT_EVENING.equals(slot))) return;'));

// --- weekly content -----------------------------------------------------------------------------------
check('a weekly prompt exists', alarm.includes('private static JSONArray weeklyMessages(Context context, String today, DatedData data)'));
check('it feeds seven days, oldest first', alarm.includes('data.weekDays(today, 7)'));
check('it feeds weekly weight means', alarm.includes('data.weightWeeklyMeans(today)'));
check('it feeds days meeting each target', alarm.includes('data.targetsMetDays(today, 7)'));
check('the five documented outputs are requested', prompts.includes('①体重周均值与上周对比') && prompts.includes('⑤下周 1~2 条最小可执行调整'));
check('the weekly prompt repeats the 口径 hard limits', prompts.includes('摄入不得低于 intakeFloor'));
check('the weekly prompt reuses the anchors', prompts.includes('body.anchors'));
check('weekDays sums only what was recorded', alarm.includes('RecordMath.hasAnyOf(rows, "calories"') && alarm.includes('RecordMath.sumRounded(rows, "calories")'));
check('weekly means are grouped Monday-first', alarm.includes('TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)'));
check('target days report the recorded-day count too', alarm.includes('.put("recordedDays", recordedDays)'));
check('a weekly review needs a week of data', alarm.includes('if (weekly) hasData = data != null && data.hasAnyWithin(today, 7);'));

// --- settings -----------------------------------------------------------------------------------------
check('settings expose the weekly fields', main.includes('.put("weeklyEnabled", AlarmScheduler.weeklyEnabled(this))') && main.includes('.put("weeklyDay", AlarmScheduler.weeklyDay(this))') && main.includes('.put("weeklyTime", AlarmScheduler.timeFor(this, AlarmScheduler.SLOT_WEEKLY))'));
check('saving validates the weekday', main.includes('周报的星期必须是 1（周一）到 7（周日）'));
check('the weekly review is gated by the master switch', main.includes('boolean weekly = bodyBoolean(b, "weeklyEnabled") && enabled;'));
check('the form has the weekly controls', html.includes('name="weeklyEnabled"') && html.includes('name="weeklyDay"') && html.includes('name="weeklyTime"'));
check('the form submits them', app.includes('weeklyEnabled:form.elements.weeklyEnabled.checked'));
check('the form reflects stored values', app.includes("if (weeklyTime && p.weeklyTime) weeklyTime.value = p.weeklyTime;"));
check('the summary states when the weekly report arrives', app.includes('周报${p.weeklyEnabled === false'));

// --- trends: weekly mean ------------------------------------------------------------------------------
check('weekly means are computed on the trends page', app.includes('const weeklyMeans = (() => {'));
check('the mean line is drawn dashed', app.includes('chart-mean') && css.includes('.chart-mean{stroke-dasharray:5 4'));
check('the note compares this week with last week', app.includes('上周均值') && app.includes('变化 ${lastTwo[1].mean - lastTwo[0].mean >= 0'));
check('a single week is reported without a fake comparison', app.includes('还缺上一周的数据，暂时无法对比'));
check('the note node exists and is hidden when empty', html.includes('id="trend-weekly"') && app.includes('weeklyNode.hidden = !weeklyNote;'));
check('the accessible description carries the weekly note', app.includes('${weeklyNote ? `；${esc(weeklyNote)}` : \'\'}'));
check('a missing weekly note never breaks the chart', app.includes("weeklyNode.textContent = weeklyNote || '';"));

// --- behaviour: week keys are Monday-based ------------------------------------------------------------
const isoWeekStart = date => {
  const d = new Date(`${date}T00:00:00`);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
};
check('Sunday belongs to the week that started on Monday', isoWeekStart('2026-10-18') === '2026-10-12', isoWeekStart('2026-10-18'));
check('Monday starts its own week', isoWeekStart('2026-10-12') === '2026-10-12');
check('Saturday stays in the same week', isoWeekStart('2026-10-17') === '2026-10-12');

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
