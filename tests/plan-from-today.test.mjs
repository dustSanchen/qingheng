/**
 * 2026-11-18 用户四条反馈的断言（第二轮）：
 *  1. 训练情况由「当天有没有保存训练动作」判断，不再手填；
 *  2. 删掉「日常习惯」里的训练情况选项；
 *  3. 图标入口里的跳转文字不再带下划线；
 *  4. 训练安排从「今天」起算 7 天，标题回到「本周安排」。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const alarm = fs.readFileSync('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', 'utf8');

// --- 1/2. 训练情况不再手填 -----------------------------------------------------------------------------
check('the habit form drops the training select', !html.includes('id="habit-training"') && !html.includes('name="training"'));
check('the habit form keeps steps and water', html.includes('id="habit-steps"') && html.includes('name="water"'));
check('the habit form says where training comes from', html.includes('训练日按当天保存的训练动作判断'));
check('one derivation helper exists', app.includes('function trainedOn(date)'));
check('it counts named exercises only', app.includes("return exercisesFor(date).some(item => item && String(item.name || '').trim());"));
check('the day budget follows the derivation', app.includes("const trained = typeof trainedOn === 'function' ? !!trainedOn(date) : false;"));
check('the habit submit no longer sends training', !app.includes("form.elements.training.value===''") && app.includes("numericForm(form,['steps','water'])"));
check('the check card no longer invents a missed training chip', !app.includes("chip('补训练', 'icon-glyph-training.svg', 'training-form')"));
check('the today hint carries planned training instead', app.includes('function trainingStateFor(input)') && app.includes("trainingState === 'planned'"));
check('the today tile reads the derivation', app.includes("const training = trainedOn(activeDate) ? '已训练' : '未记录';"));
check('the profile caption explains the switch', app.includes('记录页保存训练动作后自动切换'));
check('the training log tag stops guessing', !app.includes("'已练 · 动作未填'"));
check('the native context derives training from exercises too', main.includes('JSONArray list = row.optJSONArray("exercises");') && alarm.includes('JSONArray list = row.optJSONArray("exercises");'));
check('the old manual flag is no longer parsed natively', !main.includes('Object trained = row.opt("training")') && !alarm.includes('Object trained = row.opt("training")'));

// --- 3. 图标入口的超链接文字不带下划线 -------------------------------------------------------------------
check('the icon link clears its underline', /\.check-fix\{[^}]*text-decoration:none/.test(css));

// --- 4. 计划从今天起算 ----------------------------------------------------------------------------------
check('the window starts at the viewed day', app.includes('function planStartDate()') && app.includes("return validDate(activeDate) ? activeDate : localDate();"));
check('the renderer uses it', app.includes('const startDate = planStartDate();'));
check('today session and the plan share one start', app.includes('function weekPlanToday() {\n    const weekStart = planStartDate();'));
check('the header says this week', app.includes("'<h3 class=\"plan-sub\">本周安排 · '"));
check('no next-week wording is left in the plan', !app.includes('下周安排 · ') && !app.includes('下周训练安排'));
check('the strip covers seven days from the start', app.includes('for (let offset = 0; offset < 7; offset++) {') && app.includes('const day = shiftDay(weekStartPlan, offset);'));
check('the strips follows the plan start', app.includes('const weekStartPlan = startDate;'));
check('the generator spreads the sessions from day 0', app.includes('const date = new Date(start + \'T00:00:00\');') && app.includes('date.setDate(date.getDate() + slots[index]);'));
// 2026-11-19：按钮文案改成跟着所看的日期走（今天 / MM-DD），所以不再是一整句字面量。
check('the schedule button is rendered again', app.includes('data-plan-schedule="1"') && app.includes("应用本周计划 · 写入' + esc(dayLabel(activeDate)) + '起 "));
check('the dead plan-table expression is gone', !app.includes("+ '<div class=\"plan-days\">'"));
check('the suggested marker moved into the strip detail', app.includes("planDay.suggested ? '（训练库建议）' : ''"));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
