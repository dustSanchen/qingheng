/**
 * This round: today's advice is the default view, the training window exists with its own consent and a
 * training-only prompt, habits gained one-tap chips, and the chat box gained suggestion chips.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const html = read('app/src/main/assets/index.html');
const app = read('app/src/main/assets/app.js');
const rest = read('app/src/fragments/70-rest.fragment.js');
const head = read('app/src/fragments/00-head.fragment.js');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');

// --- today's advice is the default ---------------------------------------------------------------
check('a today-advice card exists', html.includes('id="push-today-card"') && html.includes('id="push-today"'));
check('the history card is labelled as history', html.includes('<h2>历史建议</h2>'));
check('opening the push subpage loads today', head.includes("if (sub === 'push') {loadTodayAdvice().catch(() => {});}"));
check('the loader filters to today', rest.includes('String(row.date) === today'));
check('today is grouped by slot order', rest.includes("const order = {morning: 0, meal: 1, evening: 2, weekly: 3}"));
check('slot names are human', rest.includes("morning: '白天建议'") && rest.includes("evening: '晚间复盘'"));
check('an empty day is explained', rest.includes('今天还没有生成建议'));

// --- the training window ---------------------------------------------------------------------------
// 2026-11-17 用户要求「将今日训练建议移至问答中」：训练建议卡现在位于问答页，不再是今天页的卡。
check('the training window lives in the chat view', html.includes('id="training-advice"') && html.includes('id="training-advice-form"') &&
  html.indexOf('id="training-advice"') > html.indexOf('id="view-chat"') && html.indexOf('id="chat-tabs"') > html.indexOf('id="view-chat"'));
check('it has three presets', rest.includes("'今天练什么最划算？'") && rest.includes("'只有 40 分钟，怎么排？'") && rest.includes("'昨晚没睡好，今天强度怎么调？'"));
check('it uses the shared external consent', !html.includes('training-advice-consent') && rest.includes('externalConsent()'));
check('the consent choice lives in settings', html.includes('id="settings-consent"') && html.includes('id="ob-allow"'));
check('it asks the chat route for training focus', rest.includes("focus: 'training'"));
check('the answer renders as rich text', rest.includes('answerBox.innerHTML = answerHtml(reply)'));
check('the native side narrows the prompt for training', main.includes('"training".equals(b.optString("focus", ""))') && main.includes('本次只回答训练安排'));

// --- habits lose friction ---------------------------------------------------------------------------
check('habit presets exist', html.includes('id="habit-chips"'));
// 2026-11-18：睡眠与体重挪到「记录·身体 → 今天两样」，习惯卡片只留步数与饮水。
// 2026-11-22：固定六档改为「滑块 + 你存过的常用值」，兜底三档仍只覆盖步数与饮水。
check('presets cover steps and water', rest.includes('HABIT_QUICK_FALLBACK = {steps: [6000, 8000, 10000], water: [1500, 2000, 2500]}') && !rest.includes('sleep: ['));
check('a slider exists for each metric', rest.includes('HABIT_SLIDER') && rest.includes("input[type=\"range\"]") && html.includes('id="habit-chips"'));
check('a copy-yesterday shortcut exists', rest.includes('data-habit-copy') && rest.includes("shiftDay(localDate(), -1)"));
check('copying fills only recorded values', rest.includes("if (number(rowData[key]) !== null) fillFrom(key, number(rowData[key]));"));

// --- chat suggestions ---------------------------------------------------------------------------------
check('chat suggestion chips exist', html.includes('id="chat-chips"') && rest.includes('function installChatChips'));
check('the suggestions are state questions', rest.includes("'我今天蛋白够吗？'") && rest.includes("'本周体重趋势怎么样？'"));

// --- advice wording is still honest about the notification limit ---------------------------------------
check('the advice prompt still asks for a one-line push body', prompts.includes('通知栏只显示很短的一行'));
check('the advice prompt carries the goal ranges without a global floor', prompts.includes('缺口不得超过 deficitCapPercent% 的维持热量') && prompts.includes('不另设全局地板'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
