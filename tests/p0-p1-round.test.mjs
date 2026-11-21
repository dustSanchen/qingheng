/**
 * Assertions for P0-2 / P0-3 / P1-5.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const sched = read('app/src/main/java/cn/qingheng/health/AlarmScheduler.java');
const alarm = read('app/src/main/java/cn/qingheng/health/AlarmReceiver.java');
const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
const css = read('app/src/main/assets/styles.css');

// --- P0-2: a silent day still gets one reminder ------------------------------------------------------
check('the scheduler remembers which day the last reminder was', sched.includes('KEY_LAST_POSTED_DAY') && sched.includes('putString(KEY_LAST_POSTED_DAY'));
check('postedToday() answers the question', sched.includes('public static boolean postedToday(Context context)'));
check('the gap rule only applies after a post', sched.includes('postedToday(context) && nextUpcomingTrigger(context) - now < MIN_GAP_MS'));
check('the receiver applies the same rule', alarm.includes('tooSoonAfterLastPost(context) && AlarmScheduler.postedToday(context)'));
check('silence is still explained when it does happen', read('app/src/main/java/cn/qingheng/health/AlarmReceiver.java').includes('本次提醒已跳过'));

// --- P0-3: the energy card says what to do next ------------------------------------------------------
check('the action line exists', html.includes('id="calorie-action"'));
// 断言更新登记（03-global-changes.md §5.1）：白灼虾/水煮蛋的克数换算已按用户要求删除（无意义），
// 改为断言「缺口给出下一餐指引」，意图不变。
// 断言更新登记（03-global-changes.md §5.1，2026-10-29）：B 节要求给出具体一份食材与克数（≤300 g、≤2 种），
// 不再只说「先吃蛋白质」。意图不变：缺口 → 下一餐可执行动作。
check('protein gap turns into one next step, not a food ladder', app.includes('下一餐补蛋白（还差') && app.includes('proteinGap') && !app.includes('掌心鸡胸'));
check('excess fat gets a cooking change', app.includes('改白灼或清蒸'));
check('excess calories gets a stop rule', app.includes('不再加餐，晚餐只吃蛋白加蔬菜'));
check('a met protein target still gives guidance', app.includes('蛋白质已达标，剩下的额度分给主食与蔬菜即可'));
check('the action line is only filled when there is data', app.includes("const protein = number(totals.protein), proteinMin = number(p.proteinMin)"));

// --- P1-5: training insights ---------------------------------------------------------------------------
check('insights reuse weeklyVolume', app.includes("typeof weeklyVolume === 'function' ? weeklyVolume() : []"));
check('a stalled lift is named with both weeks', app.includes('连续两周没有进步'));
check('a swap is offered per lift', app.includes("'深蹲': '腿举'"));
check('a deload is suggested from the volume jump', app.includes('下周减量 40% 当 deload'));
check('insights render into the training card', html.includes('id="training-advice-insights"') && app.includes('function renderTrainingInsights()'));
check('insights are refreshed with the rest of the page', app.includes('renderTrainingInsights();'));
check('the plan checklist rows stay horizontal', css.includes('.adv-plan-item{display:flex;flex-direction:row'));
check('insights render as labelled rows', app.includes('adv-insight-tag') && app.includes('adv-insight'));
check('the last-advice row only reads training advice', app.includes('qingheng.lastTrainingAdvice') && app.includes('function saveLastTrainingAdvice'));
check('opening it stays in the card instead of jumping to chat', !/last-chat-open[\s\S]{0,240}switchTab\('chat'\)/.test(app));
check('external consent is one switch in settings', app.includes("EXTERNAL_CONSENT_KEY = 'qingheng.consent.external'") && html.includes('id="settings-consent"'));
check('the per-box consent rows are gone', !html.includes('training-advice-consent') && !html.includes('id="advice-ai"') && !html.includes('id="ai-plan-consent"') && !html.includes('id="chat-consent"') && !html.includes('id="estimate-consent"'));
check('the data previews are hidden', html.includes('id="chat-data-preview-panel" hidden') && html.includes('id="advice-data-preview-panel" hidden'));
check('quick record lists favourites first', app.includes('收藏的餐食优先出现在'));
check('settings pointers name entries that exist', app.includes('我的 → 数据与关于') && !app.includes('数据、外观与说明'));
check('web search is a toggle, not a details section', html.includes('id="chat-web-toggle"') && !html.includes('id="chat-consent-panel"'));
check('the chat notes move into the profile drawer', app.includes("#view-chat .card-notes"));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
