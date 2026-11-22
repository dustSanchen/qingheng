/**
 * 合并后的 training 套件（由 114 个单文件回归合并而来，2026-11-23）。
 * 每个原文件仍在自己的函数作用域里跑：一个文件抛错只记一条 FAIL，不会中断同组其他文件。
 */
import fs from 'node:fs';
import vm from 'node:vm';
import {functionSource, constLine, constSource} from './lib/extract.mjs';

const DOMAIN_FILE = 'app/src/fragments/55-training-domain.fragment.js';
const readDomain = () => fs.readFileSync(DOMAIN_FILE, 'utf8').replace(/\r\n/g, '\n');

let __fail = 0;
async function __run(name, fn) {
  try { const n = await fn(); __fail += Number(n) || 0; }
  catch (error) { console.log('FAIL  [' + name + '] ' + (error && error.message ? error.message : error)); __fail += 1; }
}

await __run("advice-and-training-window", async () => {
/**
 * This round: today's advice is the default view, the training window exists with its own consent and a
 * training-only prompt, habits gained one-tap chips, and the chat box gained suggestion chips.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const html = read('app/src/main/assets/index.html');
const app = read('app/src/main/assets/app.js');
const rest = read('app/src/fragments/68-training-log.fragment.js') + read('app/src/fragments/70-rest.fragment.js');
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
// 2026-11-22 四模块清单之四：两张刻度卡 → 三张（加睡眠），高频值收进各自卡底两枚胶囊。
check('each habit metric owns a meter card', ['steps', 'water', 'sleep'].every(key => html.includes(`data-habit="${key}"`)));
check('quick presets are two per metric and water means "add this much"', rest.includes('HABIT_QUICK_FALLBACK = {steps: [6000, 10000], water: [250, 500]}'));
check('every meter keeps its slider and steppers', html.includes('habit-meter-track') && html.includes('role="slider"') && rest.includes('[data-habit-step]'));
check('a copy-yesterday shortcut exists', rest.includes('data-habit-copy') && rest.includes("shiftDay(localDate(), -1)"));
check('copying fills only recorded values', rest.includes('if (number(rowData[key]) === null) continue;'));

// --- chat suggestions ---------------------------------------------------------------------------------
check('chat suggestion chips exist', html.includes('id="chat-chips"') && rest.includes('function installChatChips'));
check('the suggestions are state questions', rest.includes("'我今天蛋白够吗？'") && rest.includes("'本周体重趋势怎么样？'"));

// --- advice wording is still honest about the notification limit ---------------------------------------
check('the advice prompt still asks for a one-line push body', prompts.includes('通知栏只显示很短的一行'));
check('the advice prompt carries the goal ranges without a global floor', prompts.includes('缺口不得超过 deficitCapPercent% 的维持热量') && prompts.includes('不另设全局地板'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("effort-feedback", async () => {
/**
 * 训练强度反馈 + 「今天的要求」（2026-11-19，1.4.45）。
 * 用户要求：练完问一句累不累，用简单选项喂给后续排课；并给一个窗口让他对当天的计划提要求，
 * 由模型按「经验丰富的教练」判断该不该照办，而不是无条件服从。
 * 契约：四档点选落库 → 排课时降/加一档；要求原样进提示词；不采纳时给一句教练说明。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

// --- 强度反馈的入口 ---------------------------------------------------------------------------------------
check('the training card asks how the session felt', html.includes('id="training-effort"') && html.includes('aria-label="今天练下来感觉如何"'));
for (const [value, label] of [['tooLight', '太轻'], ['justRight', '刚好'], ['tired', '有点累'], ['tooMuch', '太累']]) {
  check('option: ' + label, html.includes('data-effort="' + value + '"') && html.includes('>' + label + '</button>'));
}
check('chips use aria-pressed for the selected state', html.includes('aria-pressed="false"') && css.includes('.effort-chip[aria-pressed="true"]'));
check('the answer is stored on the day row', app.includes('async function saveTrainingEffort') && /saveTrainingEffort[\s\S]{0,600}api\("\/api\/habits"[\s\S]{0,200}effort: value/.test(app));
check('the chips follow the active date', app.includes('function renderTrainingEffort') && app.includes('if (typeof renderTrainingEffort === \'function\') renderTrainingEffort();'));
check('saving a log asks for the missing effort answer', app.includes('今天练下来感觉如何？在下面点一下'));

// --- 反馈如何影响排课 -------------------------------------------------------------------------------------
check('a recent deload signal exists', app.includes('function effortSignal') && app.includes("level: \"deload\""));
check('two tired sessions or one tooMuch trigger deload', app.includes("last === \"tooMuch\" || heavy >= 2"));
check('two light sessions trigger a push', app.includes("light >= 2 && heavy === 0"));
check('deload trims a set and lowers the load for real', /applyEffortSignalToPlan[\s\S]{0,700}Math\.max\(1,[\s\S]{0,300}reduceLoadableWeightKg/.test(app));
check('push adds one set to the first compound', app.includes('Math.min(5, (Number(first.sets) || 3) + 1)'));
check('the plan runs through the effort signal', app.includes('applyEffortSignalToPlan(parseAiPlanReply('));
check('the prompt carries the effort feedback', app.includes('最近强度反馈（用户自己点的）：') && app.includes('按降载排：每个配重动作少一组'));

// --- 今天的要求 -------------------------------------------------------------------------------------------
check('the plan card can take a request, stored with the preferences', html.includes('id="plan-request"') && html.includes('maxlength="200"') &&
  html.indexOf('id="plan-prefs"') < html.indexOf('id="plan-request"') && html.indexOf('id="plan-request"') < html.indexOf('id="pref-save"'));
check('the request is read when planning', app.includes('const requestText = String((requestBox && requestBox.value) || "").trim().slice(0, 200)'));
check('the model is told to judge, not to obey', app.includes('用户今天的要求（可能不专业，需要你判断）：') && app.includes('判断原则：先保目标口径'));
check('a rejected request leaves a one-line coach note', app.includes('把一句不超过 40 字的原因写进第一个动作的 note 字段'));
check('the coach note is parsed and stored locally', app.includes('writePlanNote(activeDate, noteMatch ? noteMatch[1] : "")') && app.includes('function readPlanNote'));
check('the coach note has a slot in the card', html.includes('id="ai-plan-note"') && css.includes('.ai-plan-note{'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("habit-and-training-mode", async () => {
/**
 * 本轮断言：小习惯跳转修复、图标、推送健身提示、不健身选项。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');
const alarm = read('app/src/main/java/cn/qingheng/health/AlarmReceiver.java');
const targets = read('app/src/fragments/40-targets.fragment.js');

// --- the habit jump opens the collapsed group --------------------------------------------------------
check('a reveal helper exists', app.includes('function revealField(id, options = {})'));
check('it opens the details before focusing', app.includes('if (details && !details.open) details.open = true;'));
check('the jump uses it after the tab switch', app.includes('setTimeout(() => revealField(button.dataset.focus), 60)'));
check('the habit card still exposes the anchor', html.includes('data-focus="habit-steps"'));

// --- habit icons ----------------------------------------------------------------------------------------
for (const name of ['icon-glyph-training.svg', 'icon-habit-steps.svg', 'icon-habit-sleep.svg', 'icon-water.svg']) {
  check(`icon exists: ${name}`, fs.existsSync(`app/src/main/assets/${name}`));
}
check('the tiles render images, not characters', app.includes("icon-habit-steps.svg") && !app.includes("['♧',"));
check('today habits render as a value grid', app.includes('class="habit-cell"') && app.includes('data-habit-jump') && html.includes('class="habit-grid"'));
check('today metric icons come from the inline lucide table', app.includes('function metricIcon') && app.includes('const glyphs = {') && app.includes('Lucide') && app.includes('metric-glyph'));

// --- push carries one training line ---------------------------------------------------------------------
check('the prompt keeps training guidance without inventing a workout', prompts.includes('训练记录缺失就不提训练') && prompts.includes('body.trainingDisabled 为 true'));
check('it is capped at two bullets overall', prompts.includes('总数仍不超过 2 条') || prompts.includes('每条不超过 30 个汉字'));
check('a no-training user gets none', prompts.includes('body.trainingDisabled 为 true'));
check('the receiver sends trainsToday', alarm.includes('user.put("trainsToday"'));
check('and trainingDisabled', alarm.includes('data.trainingOff()') && alarm.includes('user.put("trainingDisabled", true)'));

// --- training frequency lives in 记录→训练计划 only -------------------------------------------------------
check('the profile no longer asks for training frequency', !html.includes('每周力量训练次数'));
check('the wizard points at the training plan instead', html.includes('训练天数取自「记录 → 训练计划」'));
check('training days are read from planPrefs', targets.includes('function plannedSessions()') && targets.includes('qingheng.planPrefs'));
check('sedentary is a real answer, not an unset value', targets.includes("const trainingOff = String(rawTraining) === 'none';") && targets.includes('const trainingUnset = !trainingOff'));
check('the UI has one switch for training visibility', app.includes('function trainingEnabled()') && app.includes('function applyTrainingVisibility()'));
check('it hides the training cards', app.includes("'training-log', 'training-advice', 'training-volume-card'"));
check('it re-runs on every render', /renderTrainingInsights\(\);[\s\S]{0,200}applyTrainingVisibility\(\);/.test(app));
;return typeof fail === 'number' ? fail : 0;
});

await __run("plan-from-today", async () => {
/**
 * 2026-11-18 用户四条反馈的断言（第二轮）：
 *  1. 训练情况由「当天有没有保存训练动作」判断，不再手填；
 *  2. 删掉「日常习惯」里的训练情况选项；
 *  3. 图标入口里的跳转文字不再带下划线；
 *  4. 训练安排从「今天」起算 7 天，标题回到「本周安排」。
 */

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
check('the habit submit no longer sends training', !app.includes("form.elements.training.value===''") && app.includes("numericForm(form,['steps','water','sleep'])"));
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
check('the schedule button is rendered again', app.includes('data-plan-schedule="1"') && app.includes("写入' + esc(dayLabel(activeDate)) + '起 "));
check('the dead plan-table expression is gone', !app.includes("+ '<div class=\"plan-days\">'"));
check('the suggested marker moved into the strip detail', app.includes("planDay.suggested ? '（训练库建议）' : ''"));
;return typeof fail === 'number' ? fail : 0;
});

await __run("plan-reply-behavior", async () => {
/**
 * 排课链路的行为测试（2026-11-19，1.4.46 起）。
 *
 * 为什么不用字符串断言：重量全空的 bug 是在 76 个「grep 式」用例全绿的情况下发出去的。
 * 这里把真实模型回复存成 fixture（tests/fixtures/plan-reply-1.4.44.json），
 * 从片段里切出真实函数跑全链路：解析 → 缺重量兜底 → 渐进 → 强度降载 → 本地记忆。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const readSrc = path => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const rest = readSrc('app/src/fragments/68-training-log.fragment.js') + readSrc('app/src/fragments/70-rest.fragment.js');
const training = readSrc('app/src/fragments/60-training-copy.fragment.js');
const onboarding = readSrc('app/src/fragments/68-training-log.fragment.js') + readSrc('app/src/fragments/50-onboarding.fragment.js');
// 2026-11-23 Phase 2：自重判定 / 可装重量 / 重量记忆 / 渐进全部收进 55-training-domain，
// 直接整份喂进沙箱（这一层是零 DOM 的纯函数），不再按相邻函数切标记。
const domain = readSrc(DOMAIN_FILE);

/** 取 [startMarker, endMarker) 之间的一段源码；两端标记必须存在，否则直接崩，避免静默截空。 */
function sliceBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`${label} slice markers not found`);
  return source.slice(start, end);
}

const pieces = [
  // 自重判定 + 可装重量 + 重量记忆 + 渐进 + 计划生成（55 整层）
  domain,
  // 强度信号 + 教练说明（70）
  sliceBetween(rest, '  const EFFORT_LABELS = ', '  function syncPlanDoneFromRow(', 'effort block'),
  // 补重量 + 逐行转换（70）
  sliceBetween(rest, '  function planWeightFor(row) {', '  /** 流式期间只认已经闭合的', 'plan row'),
  // 解析模型回复（70）
  sliceBetween(rest, '  function parseAiPlanReply(reply) {', '  async function askAiPlan(', 'parse reply'),
  // 本地上下文卡 + 本地校验器（70，1.4.47）
  sliceBetween(rest, '  function compilePlanContext(date) {', '  async function askAiPlan(', 'plan context'),
];

const store = new Map();
const sandbox = {
  state: {profile: {weight: 88, goal: 'lean'}, habits: [], meals: [], measurements: []},
  activeDate: '2026-11-19',
  planPrefs: () => ({days: 4, split: 'full', gear: 'mixed', minutes: 45}),
  GOAL_PRESETS: {lean: {muscleSetsPerWeek: [12, 18], reps: [8, 15], rir: [1, 2]}},
  GOAL_LABEL: {lean: '薄肌（线条）', gain: '增肌'},
  GEAR_LABELS: {mixed: '综合', barbell: '杠铃为主'},
  dayTemplateNote: () => '今天（推）',
  // 与 app 里同口径的粗略时长折算：8 分钟热身 + 每组 45 秒执行 + 90 秒休息。
  planMinutes: plan => Math.round(8 + (plan || []).reduce((sum, item) => sum + (Number(item && item.sets) || 0) * 135 / 60, 0)),
  number: v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)),
  validDate: value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')),
  localDate: () => '2026-11-19',
  shiftDay: (date, offset) => {
    const base = Date.parse(String(date) + 'T00:00:00Z') + offset * 86400000;
    return new Date(base).toISOString().slice(0, 10);
  },
  exercisesFor: date => {
    const row = (sandbox.state.habits || []).find(item => item && item.date === date);
    return row && Array.isArray(row.exercises) ? row.exercises : [];
  },
  localStorage: {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
  },
  Date, Math, Map, Array, String, Number, Object, JSON, parseInt, parseFloat, isNaN, console,
};
vm.createContext(sandbox);
vm.runInContext(pieces.join('\n') + `
this.parseAiPlanReply = parseAiPlanReply;
this.planItemFromRow = planItemFromRow;
this.plannedWeightFor = plannedWeightFor;
this.progressiveWeightKg = progressiveWeightKg;
this.applyEffortSignalToPlan = applyEffortSignalToPlan;
this.effortSignal = effortSignal;
this.rememberPlanWeights = rememberPlanWeights;
this.readWeightMemory = readWeightMemory;
this.compilePlanContext = compilePlanContext;
this.validatePlanAgainstContext = validatePlanAgainstContext;
`, sandbox);

const fixture = JSON.parse(readSrc('tests/fixtures/plan-reply-1.4.44.json'));
const plan = sandbox.parseAiPlanReply(fixture.reply);

// --- 1. 真机样本原样通过 -----------------------------------------------------------------------------------
check('the real reply parses into five moves', plan.length === 5, plan.length);
check('model-provided weights survive', plan[0].weight === 55 && plan[1].weight === 16 && plan[2].weight === 20, plan.map(item => item.weight).join('/'));
check('weights are tagged with their source', plan[0].weightSource === 'model', plan[0].weightSource);
check('bodyweight moves keep no kg', plan[3].weight === null && plan[3].weightSource === 'bodyweight', `${plan[3].weight}/${plan[3].weightSource}`);

// --- 2. 模拟故障：模型整份回复都不给重量（这就是用户报的 bug） ----------------------------------------------
const stripped = JSON.stringify(JSON.parse(fixture.reply).map(row => ({...row, weight: undefined})));
sandbox.state.habits = [{date: '2026-11-18', exercises: [{name: '杠铃卧推', sets: 3, reps: 8, weight: 50}]}];
sandbox.activeDate = '2026-11-19';
const rescued = sandbox.parseAiPlanReply(stripped);
check('every loaded move still gets a weight when the model drops them', rescued.slice(0, 3).every(item => item.weight > 0), rescued.slice(0, 3).map(item => item.name + ' ' + item.weight).join(' / '));
check('a recorded lift progresses from its own history', rescued[0].weight === 55 && rescued[0].weightSource === 'log', `${rescued[0].weight}/${rescued[0].weightSource}`);
check('an unrecorded dumbbell move falls back to the bodyweight ratio', rescued[1].weight > 0 && rescued[1].weightSource !== 'model', `${rescued[1].weight}/${rescued[1].weightSource}`);
check('bodyweight moves stay empty even in the fallback', rescued[3].weight === null, rescued[3].weight);

// --- 3. 渐进规则：上限与退档 ------------------------------------------------------------------------------
sandbox.rememberPlanWeights(rescued);
const memory = sandbox.readWeightMemory();
check('rescued weights are remembered locally', Object.keys(memory).length >= 3, Object.keys(memory).length);
const capped = sandbox.progressiveWeightKg('杠铃卧推', {weight: 50, reps: 10, date: '2026-11-18'});
// 杠铃只能按整 5 kg 走：50 加一档 = 52.5 装不出来，落到 55（仍在 +10% 上限内）。
check('a strong set adds one step, rounded to a loadable bar', capped === 55, capped);
const held = sandbox.progressiveWeightKg('杠铃卧推', {weight: 50, reps: 6, date: '2026-11-18'});
check('six reps hold the weight', held === 50, held);
const backedOff = sandbox.progressiveWeightKg('杠铃卧推', {weight: 50, reps: 4, date: '2026-11-18'});
check('four reps back off a step', backedOff === 45, backedOff);
const stale = sandbox.progressiveWeightKg('杠铃卧推', {weight: 50, reps: 10, date: '2026-08-01'});
check('a long layoff does not add weight', stale <= 50, stale);

// --- 4. 强度反馈真的改变清单 ------------------------------------------------------------------------------
sandbox.state.habits = [
  {date: '2026-11-19', exercises: [{name: '杠铃卧推', sets: 3, reps: 8, weight: 50}], effort: 'tooMuch'},
];
sandbox.activeDate = '2026-11-19';
const deloadSignal = sandbox.effortSignal();
check('one "tooMuch" is enough to call a deload', deloadSignal.level === 'deload', deloadSignal.level);
const deloaded = sandbox.applyEffortSignalToPlan(JSON.parse(JSON.stringify(plan)));
check('deload trims a set but never below one', deloaded[0].sets === 2 && deloaded[4].sets === 1 && deloaded[1].sets === 1, deloaded.map(item => item.sets).join('/'));
check('deload backs the weight off and actually lands lower', deloaded[0].weight === 50 && deloaded[1].weight === 14, `${deloaded[0].weight}/${deloaded[1].weight}`);

sandbox.state.habits = [
  {date: '2026-11-18', exercises: [{name: '杠铃卧推', sets: 3, reps: 8, weight: 50}], effort: 'tooLight'},
  {date: '2026-11-17', exercises: [{name: '杠铃卧推', sets: 3, reps: 8, weight: 50}], effort: 'tooLight'},
];
sandbox.activeDate = '2026-11-19';
check('two light sessions call a push', sandbox.effortSignal().level === 'push', sandbox.effortSignal().level);
const pushed = sandbox.applyEffortSignalToPlan(JSON.parse(JSON.stringify(plan)));
check('push adds a set to the first loaded move', pushed[0].sets === 4, pushed[0].sets);

sandbox.state.habits = [{date: '2026-11-18', exercises: [], effort: 'justRight'}];
check('a single "justRight" changes nothing', sandbox.effortSignal().level === 'keep' && sandbox.applyEffortSignalToPlan(plan) === plan, sandbox.effortSignal().level);

// --- 5. 本地上下文卡与校验器（1.4.47）---------------------------------------------------------------------
sandbox.state.habits = [{date: '2026-11-18', exercises: [{name: '杠铃卧推', sets: 3, reps: 8, weight: 50}]}];
const context = sandbox.compilePlanContext('2026-11-19');
check('the context card names the body part', context.text.includes('部位') && context.text.includes('推'), context.text.split('\n')[1]);
check('it carries the per-muscle set range from the local preset', context.text.includes('每部位组数：12~18 组'), context.text.split('\n')[3]);
check('it carries the time budget', context.text.includes('时长：45 分钟'), context.text.split('\n')[2]);
check('it carries only same-part baselines', context.baselines.length >= 1 && context.baselines.length <= 3
  && context.baselines.every(name => /卧推|推肩|飞鸟|下压|臂屈伸|侧平举/.test(name))
  && context.text.includes('杠铃卧推 3x8 50kg'), context.baselines.join(';'));
check('the whole card stays short enough for a prompt', context.text.length <= 700, context.text.length);

const draft = [
  {name: '杠铃卧推', sets: 7, reps: 8, weight: 62.5},
  {name: '上斜哑铃卧推', sets: 5, reps: 10, weight: 16},
  {name: '双杠臂屈伸', sets: 5, reps: 8, bodyweight: true},
  {name: '蝴蝶机夹胸', sets: 4, reps: 12, weight: 25},
  {name: '绳索下压', sets: 4, reps: 12, weight: 25}
];
const validated = sandbox.validatePlanAgainstContext(JSON.parse(JSON.stringify(draft)), context);
check('unloadable weights are snapped by the local validator', validated[0].weight === 65, validated[0].weight);
check('sets are capped at five', validated.every(item => Number(item.sets) <= 5), validated.map(item => item.sets).join('/'));
check('an over-long plan is trimmed to the time budget', sandbox.planMinutes(validated) <= context.minutes + 3, sandbox.planMinutes(validated));
check('the first move is never emptied', validated[0].sets >= 1, validated[0].sets);
check('bodyweight moves keep their sets untouched by weights', validated[2].weight === undefined || validated[2].weight === null, validated[2].weight);
;return typeof fail === 'number' ? fail : 0;
});

await __run("plan-shared-template", async () => {
/**
 * P0–P2（2026-11-19，用户：「完成上文P0-P2问题修复，并确保训练时间安排中包含了组间休息」）
 *
 * P0 部位只有一个来源：周计划当天的 template，排今天与问答的训练建议共用一句话。
 * P1 时长按「组数 ×（每组执行 + 该动作的组间休息）」算，提示词与界面同一口径；单次课正式组 6~10 组。
 * P2 日期文案与两套清单的关系说明。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const training = read(DOMAIN_FILE) + read('app/src/fragments/60-training-copy.fragment.js');
const rest = read('app/src/fragments/68-training-log.fragment.js') + read('app/src/fragments/70-rest.fragment.js');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');

// --- P0 部位单一来源 -----------------------------------------------------------------------------
check('部位来源只有一个函数', training.includes('function dayTemplateSlot(date = activeDate)')
  && training.includes('function dayTemplateNote(date = activeDate)'));
check('排今天用共享那一句', rest.includes("const rotationText = typeof dayTemplateNote === \"function\" ? dayTemplateNote(activeDate) : \"\";"));
check('问答的训练建议也用同一句', rest.includes("const templateNote = typeof dayTemplateNote === 'function' ? dayTemplateNote(localDate()) : '';")
  && rest.includes("const questionWithNote = templateNote ? templateNote + '\\n' + question : question;"));
check('两处都不再各自硬编码部位名', !rest.includes("const TEMPLATE_LABEL = {push: \"推\", pull: \"拉\", legs: \"腿\"};"));

// --- P1 时长含组间休息 ---------------------------------------------------------------------------
check('每组时间取自 restSecondsFor 而不是固定值',
  rest.includes('function planItemMinutes(item)') && rest.includes('const rest = typeof restSecondsFor === "function" ? restSecondsFor(name) : 90;'));
check('旧的固定 2.5 分钟/组已移除', !rest.includes('AI_PLAN_MINUTES_PER_SET'));
check('整份清单用含休息的折算', rest.includes('planMinutes(plan)') && rest.includes('function planItemMinutes(item)'));
// Phase 2：原来那句「含组间休息约需」挂在已删除的 #ai-plan-summary 上；现役入口是 #ai-plan-timing 的「折算 N 分钟」。
check('界面写明含组间休息', rest.includes('" / 折算 "') && rest.includes('（上限 '));
check('改时长不再有死按钮（Phase 2 已移除 #ai-plan-summary）', !rest.includes('data-plan-minutes') && !rest.includes('function planMinutesStep'));
check('有氧按自己的时长算，不套组次', rest.includes('const cardio = number(item && item.durationMin);'));

// --- P1 单次课组数口径 ---------------------------------------------------------------------------
check('排今天的上下文卡按部位给组数，不卡整节课',
  rest.includes('function compilePlanContext') && rest.includes('每部位组数：') && rest.includes('总组数按这个时长装'));
check('计划理由也说清是每个部位', training.includes('单次每个部位 6~10 组正式组'));
check('原生提示词也按休息折算，不再数动作个数',
  main.includes('组数按时长算，且必须把组间休息算进去') && !main.includes('动作数量按时长定：30 分钟排 4 个'));

// --- P2 日期文案与两套清单的关系 -----------------------------------------------------------------
check('今天加入按钮按所看日期取名', training.includes("这节加入"));
check('应用本周计划按所看日期取名', training.includes("写入' + esc(dayLabel(activeDate)) + '起 "));
check('能量卡按所看日期取名', rest.includes('const noteDay = typeof dayLabel === "function" ? dayLabel(activeDate) : "今天";'));
check('两套清单有了关系说明', training.includes('两者不一致时以日志为准'));

// --- 生成物同步 ---------------------------------------------------------------------------------
check('app.js 与片段同步',
  app.includes('function dayTemplateNote(date = activeDate)')
  && app.includes('function planMinutes(items)')
  && app.includes('上次排课耗时 '));
;return typeof fail === 'number' ? fail : 0;
});

await __run("plan-timing", async () => {
/**
 * 排课耗时的可见性（2026-11-19，1.4.49）。
 * 事故：1.4.48 把耗时只写进 toast，10 秒自动消失，用户点完说「页面没有弹时间」。
 * 契约：耗时与失败原因必须留在今日顺序卡上，不能只活在提示条里。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

check('the plan card has a slot for the last run timing', html.includes('id="ai-plan-timing"'));
check('timing is rendered from local storage', app.includes('function renderPlanTiming') && app.includes('"qingheng.planTiming."'));
check('renderPlanTiming runs with the plan render', /function syncAiPlanControls\(\)[\s\S]{0,300}renderPlanTiming\(\)/.test(app));
check('a failed run also leaves evidence', /catch \(error\) \{[\s\S]{0,400}qingheng\.planTiming\.[\s\S]{0,200}error:/.test(app));
check('the toast still carries the numbers', app.includes('耗时 ') && app.includes('首条 '));
check('both numbers come from the same measurement', app.includes('planFirstRowAt') && app.includes('planTotalMs'));
check('the wait is staged with real numbers', app.includes('已取 " + (planStageInfo.recordDays') && app.includes('正在按你的口径排'));
check('the streamed rows take over the busy text', app.includes('if (planShownRows > 0) return;'));
check('the card also reports sets and minutes after the local check', app.includes('Number(timing.sets)') && app.includes('折算 '));
;return typeof fail === 'number' ? fail : 0;
});

await __run("plan-weight", async () => {
/**
 * 用 AI 排今天的重量链（2026-11-19，1.4.44）。
 * 事故：模型只给第一个动作写 kg，其余整行留空——提示词结尾写着「不确定就留空」，
 * 客户端也只在 14 天内找到同名记录时才补重量。
 * 契约：三层兜底（同名记忆 → 同族迁移 → 体重比例起步）+ 本地记忆持久化 + 渐进规则。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

// --- 本地记忆 ---------------------------------------------------------------------------------------------
check('a local weight memory survives restarts', app.includes("const WEIGHT_MEMORY_KEY = 'qingheng.exerciseWeights'") && app.includes('localStorage.setItem(WEIGHT_MEMORY_KEY'));
check('the memory is seeded from real training records', app.includes('function seedWeightMemoryFromHistory') && app.includes("source: 'log'"));
check('a weaker source never overwrites a stronger one', app.includes('WEIGHT_SOURCE_RANK') && app.includes("if (prev && number(prev.weight) > 0)"));

// --- 提示词 -----------------------------------------------------------------------------------------------
check('the prompt no longer tells the model to leave weights empty', !app.includes('器械按 5 kg 递增；不确定就留空'));
check('the prompt demands a weight for every loaded move', app.includes('每个配重动作都必须给 weight'));
check('the prompt carries the starting-weight ratios', app.includes('杠铃卧推 0.5 倍体重') && app.includes('器械取杠铃的 0.8 倍'));
// 1.4.47：基线不再整份贴进提示词，改为本地编译的上下文卡（只给该部位前 3 条）。
check('the prompt gets a compiled context card instead of raw baselines', app.includes('const context = compilePlanContext(activeDate);') && app.includes('.slice(0, 3)'));
check('bodyweight moves are still allowed to carry no kg', app.includes('自重动作（引体向上、俯卧撑、双杠臂屈伸、平板支撑、卷腹）weight 留空'));

// --- 补齐与渐进 -------------------------------------------------------------------------------------------
check('a missing weight falls back to the planned weight', app.includes('function planWeightFor') && app.includes('plannedWeightFor(row && row.name)'));
check('progression is step-based and capped at +10%', app.includes('Math.min(last * 1.1, last + step)') && app.includes('const step = LOWER_BODY.test'));
check('long layoffs deload instead of adding', app.includes('if (gap > 60) return reduceLoadableWeightKg') && app.includes('if (gap > 21) return'));
check('a first timer starts from bodyweight ratios', app.includes("const bodyweight = number((state.profile || {}).weight)") && app.includes('WEIGHT_RATIOS'));
check('a same-family transfer is discounted to 85%', app.includes('* 0.85'));
check('换动作的死入口已移除，重量补全仍在清单入队时发生', !app.includes('data-ai-swap') && app.includes('plannedWeightFor(row && row.name)'));

// --- 界面与落库 -------------------------------------------------------------------------------------------
check('inferred weights are marked with 约', app.includes('class="exercise-approx"') && app.includes('约</span>'));
check('the plan explains where inferred weights came from', app.includes('重量是按体重推算的起步值') && app.includes('练完一次按实际校准'));
check('saving the plan remembers the planned load', app.includes('rememberPlanWeights(plan)'));
check('saving the training log remembers the real load', app.includes('rememberExerciseLogs(exercises, activeDate)'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("rest-timer", async () => {
/**
 * 2026-11-18：组间休息到点要有提示音（合成，不打包音频文件），休息时长按动作与目标不同。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const doc = fs.readFileSync('docs/design/27-evidence-requirements.md', 'utf8');

// --- 音效：合成器两枚短音，不依赖音频文件 --------------------------------------------------
check('a chime function exists', app.includes('function playRestChime()'));
check('it uses the Web Audio API, not an mp3', app.includes('window.AudioContext || window.webkitAudioContext') && !/rest.*\.(mp3|wav|ogg)/i.test(app));
check('the chime is two tones', app.includes('[[1318.5, 0], [1760, 0.15]]'));
check('it is primed on a user gesture so autoplay does not silence it', app.includes('function primeRestAudio()') && app.includes('primeRestAudio();'));
check('the prime happens when the timer starts', /function startRestTimer\([\s\S]{0,400}primeRestAudio\(\)/.test(app));
check('it plays exactly once when the clock hits zero', /if \(!left\) \{[\s\S]{0,160}playRestChime\(\);/.test(app));
check('a vibration rides along when supported', app.includes('navigator.vibrate(120)'));
check('it stays silent when audio is unavailable', app.includes('} catch { return null; }') && app.includes('} catch { return false; }'));

// --- 时长按动作与目标：复合 / 孤立 / 自重 / 有氧 ------------------------------------------
check('rest length is a function of the movement', app.includes('function restSecondsFor(name)'));
check('cardio gets no rest timer', app.includes('if (typeof isCardioName === \'function\' && isCardioName(name)) return 0;'));
check('compound lifts rest longer', app.includes('return longGoal ? 150 : 120;'));
check('bodyweight sits in the middle', app.includes('return longGoal ? 90 : 75;'));
check('isolation is the shortest', app.includes('return longGoal ? 90 : 60;'));
check('a gain/maintain goal uses the long tier', app.includes("const longGoal = goal === 'gain' || goal === 'maintain';"));
check('the timer takes seconds, not a hardcoded 90', app.includes('function startRestTimer(restart = false, seconds = REST_SECONDS)'));
check('restEnd follows the given length', app.includes('restEnd = Date.now() + length * 1000;'));
check('the pill label follows the start time', app.includes('`开始 ${restLength} 秒组间休息`'));
check('the ring progress follows the given length', app.includes('1 - left / Math.max(1, restLength)'));
check('marking a set starts the matching rest', app.includes("startRestTimer(true, restSecondsFor(name))"));
check('the row name is read before starting', app.includes("const name = row ? String($('[data-exercise=\"name\"]', row)?.value || '') : '';"));
check('compound and isolation are classified', app.includes('function isCompoundMove(name)') && app.includes('const ISOLATION_MOVES'));
check('isolation is excluded from compound', app.includes('if (ISOLATION_MOVES.test(text)) return false;'));
check('the pill still exists', html.includes('id="rest-timer"') && app.includes('function installRestDock()'));

// --- 行为：用假 AudioContext 跑一次，确认真的排了两个音、不是空函数 --------------------------
function grab(startMarker, endMarkers) {
  const start = app.indexOf(startMarker);
  if (start < 0) throw new Error('missing ' + startMarker);
  let end = app.length;
  for (const marker of endMarkers) {
    const i = app.indexOf(marker, start);
    if (i >= 0 && i < end) end = i;
  }
  return app.slice(start, end);
}
const audioSource = grab('let restAudio = null;', ['function syncRestDock(']) + '\nreturn {primeRestAudio, playRestChime};';
const madeOsc = [], madeGain = [], vibrations = [];
class FakeGain {
  constructor() { this.gain = {setValueAtTime() {}, exponentialRampToValueAtTime() {}}; madeGain.push(this); }
  connect(target) { return target || this; }
}
class FakeOsc {
  constructor() { this.type = ''; this.frequency = {setValueAtTime() {}}; madeOsc.push(this); }
  connect() {}
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
const fakeCtx = {currentTime: 5, state: 'running', destination: {}, createGain: () => new FakeGain(), createOscillator: () => new FakeOsc(), resume: () => Promise.resolve()};
const audioApi = new Function('window', 'navigator', audioSource)(
  {AudioContext: function () { return fakeCtx; }},
  {vibrate: ms => vibrations.push(ms)}
);
const played = audioApi.playRestChime();
check('the chime really schedules two tones', played === true && madeOsc.length === 2, `${played}/${madeOsc.length}`);
check('both tones are sine', madeOsc.every(osc => osc.type === 'sine'));
check('each tone starts and stops', madeOsc.every(osc => osc.started && osc.stopped));
check('a master gain ramps the envelope', madeGain.length >= 3);
check('it also vibrates once', vibrations.length === 1 && vibrations[0] === 120);
check('a missing AudioContext is a no-op, not a throw', (() => {
  const api = new Function('window', 'navigator', audioSource)({}, {});
  return api.playRestChime() === false;
})());

// --- 文档与证据 ---------------------------------------------------------------------------------
check('the doc records the rest ranges', doc.includes('## 4. 组间休息'));
check('the doc cites the rest-interval review', doc.includes('s40279-017-0788-x'));
check('the doc maps movement class to seconds', doc.includes('复合（卧推、深蹲、硬拉、划船、推举、引体、腿举…）') && doc.includes('| 150 s | 120 s |') && doc.includes('| 90 s | 60 s |'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-actions", async () => {
/**
 * One visible decision for today; the whole-week write is optional and explained.
 * The AI replan has one home (the training page's today sequence), not two.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('today adoption is the single visible primary', app.includes('data-adopt-today') && app.includes('把今天加入清单') && app.includes('这节加入'));
check('the advice page no longer carries a second AI button', !app.includes('改用 AI 排今天'));
check('the whole-week write is folded as optional', app.includes('id="plan-schedule-more"') && app.includes('把这周写进训练记录') && app.includes('上面的按钮只改今天的安排'));
check('the whole-week write still uses the existing schedule handler', app.includes('data-plan-schedule="1"') && app.includes('data-adopt-today'));
check('the optional fold has a clear summary affordance', css.includes('.plan-schedule-more') && css.includes('.plan-schedule-more>summary'));

// --- 1.5.30：AI 排完要能直接保存 -----------------------------------------------------------
// 只留两条行为断言：排完重新播种、推断不出重量时给保守值；流式兜底与字段名属于实现细节，不锁。
check('AI 排完会重新播种执行区', app.includes('if (typeof renderTrainingLog === "function") renderTrainingLog();') && app.includes('模型这次没有给出清单'));
check('推断不出重量时按器械给保守起步值', app.includes('const START = {barbell: 40, dumbbell: 8, machine: 20};') && app.includes('source: "gear"'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-advice-compose", async () => {
/**
 * Training advice uses the same one-surface composer as chat, with the send
 * action inside the input instead of a full-width button below it.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

check('training advice keeps its form and textarea ids', html.includes('id="training-advice-form"') && html.includes('id="training-advice-input"'));
check('training advice uses a rounded composer', html.includes('id="training-advice-composer"') && html.includes('class="chat-composer"'));
check('the send action sits inside the composer', html.includes('class="chat-send-button" aria-label="发送训练问题"'));
check('the old full-width ask button is gone', !html.includes('>问训练建议</button>'));
check('quick prompts use one horizontal strip like chat', css.includes('#training-advice #training-advice-chips{display:flex;flex-wrap:nowrap'));
check('the composer input is visually de-boxed', css.includes('#view-chat #training-advice-input{height:76px'));
check('the existing submit handler still owns the form', app.includes("$('#training-advice-form')") || app.includes('training-advice-form'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-bodyweight", async () => {
/**
 * 2026-11-18 用户要求：健身数据库区分「卧推」与「器械卧推」；没有配重的项目也能正常记录并纳入分析。
 * 行为断言从产物里抽纯函数跑，不靠字符串匹配冒充验证。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

function grab(startMarker, endMarkers) {
  const start = app.indexOf(startMarker);
  if (start < 0) throw new Error('missing ' + startMarker);
  let end = app.length;
  for (const marker of endMarkers) {
    const i = app.indexOf(marker, start);
    if (i >= 0 && i < end) end = i;
  }
  return app.slice(start, end);
}

const number = v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
// 2026-11-23 Phase 2：这些纯函数已收进 55 领域层，按函数名取，别再依赖相邻函数标记。
const domain = readDomain();
const pure = new Function('number', [
  constLine(domain, 'BODYWEIGHT_MOVES'),
  constLine(domain, 'USER_BODYWEIGHT'),
  functionSource(domain, 'readBodyweightMarks'),
  functionSource(domain, 'loadUserBodyweightMarks'),
  functionSource(domain, 'isUserBodyweight'),
  functionSource(domain, 'setUserBodyweight'),
  functionSource(domain, 'isBodyweightMove'),
  functionSource(domain, 'trainingStatsOf'),
  functionSource(domain, 'loadableWeightKg'),
  'return {isBodyweightMove, trainingStatsOf, loadableWeightKg, setUserBodyweight};'
].join('\n'))(number);
const { isBodyweightMove, trainingStatsOf, loadableWeightKg } = pure;

// --- 自重动作的判定 ------------------------------------------------------------------------------------
check('a pull-up is bodyweight', isBodyweightMove('引体向上') === true);
check('a push-up is bodyweight', isBodyweightMove('俯卧撑') === true);
check('a plank is bodyweight', isBodyweightMove('平板支撑') === true);
check('a typo\'d dip name still counts as bodyweight', isBodyweightMove('双臂杠屈伸') === true);
check('a weighted pull-up is not', isBodyweightMove('负重引体向上') === false);
check('a barbell hip bridge is not', isBodyweightMove('杠铃臀桥') === false);
check('a machine bench is not bodyweight', isBodyweightMove('器械卧推') === false);
check('an empty name is not bodyweight', isBodyweightMove('') === false);

// --- 配重档位：器械与杠铃分开算 -------------------------------------------------------------------------
check('a bodyweight move has no loadable weight', loadableWeightKg('引体向上', 10) === null, String(loadableWeightKg('引体向上', 10)));
check('a barbell bench keeps the 20 kg bar floor', loadableWeightKg('卧推', 8) === 20, String(loadableWeightKg('卧推', 8)));
check('a machine bench starts at 5 kg steps', loadableWeightKg('器械卧推', 8) === 10, String(loadableWeightKg('器械卧推', 8)));
check('a machine bench rounds to the nearest 5 kg', loadableWeightKg('器械卧推', 62) === 60, String(loadableWeightKg('器械卧推', 62)));
check('a barbell bench rounds in 5 kg jumps', loadableWeightKg('卧推', 63) === 65, String(loadableWeightKg('卧推', 63)));

// --- 三种口径：kg 容量 / 组数 / 自重次数 ----------------------------------------------------------------
const mixed = trainingStatsOf([
  {name: '卧推', setDetails: [{reps: 8, weight: 60}, {reps: 8, weight: 60}, {reps: 8, weight: 60}]},
  {name: '引体向上', setDetails: [{reps: 8, weight: null}, {reps: 6, weight: null}, {reps: 5, weight: null}]}
]);
check('kg volume ignores bodyweight sets', mixed.volume === 1440, String(mixed.volume));
check('sets count both kinds', mixed.sets === 6, String(mixed.sets));
check('bodyweight reps are counted separately', mixed.bodyweightReps === 19, String(mixed.bodyweightReps));
const bwOnly = trainingStatsOf([{name: '俯卧撑', setDetails: [{reps: 12, weight: null}, {reps: 10, weight: null}]}]);
check('a bodyweight-only session still reports sets and reps', bwOnly.volume === 0 && bwOnly.sets === 2 && bwOnly.bodyweightReps === 22, JSON.stringify(bwOnly));
const legacy = trainingStatsOf([{name: '器械卧推', sets: 3, reps: 10, weight: 40}]);
check('old records without setDetails still count', legacy.volume === 1200 && legacy.sets === 3, JSON.stringify(legacy));

// --- 数据库：器械卧推是独立动作 -------------------------------------------------------------------------
const guides = new Function([
  grab('const EXERCISE_GUIDES = [', ['const EXERCISE_HOW']),
  grab('function normalizeExerciseName(', ['function closeExerciseGuide']),
  'return {EXERCISE_GUIDES, exerciseGuideFor};'
].join('\n'))();
check('the machine bench has its own entry', guides.EXERCISE_GUIDES.some(guide => guide.name === '器械卧推' && guide.keys.includes('坐姿推胸')));
check('there is exactly one machine bench entry', guides.EXERCISE_GUIDES.filter(guide => guide.keys.includes('坐姿推胸')).length === 1);
check('卧推 resolves to the barbell guide', guides.exerciseGuideFor('卧推').name === '卧推');
check('器械卧推 resolves to the machine guide', guides.exerciseGuideFor('器械卧推').name === '器械卧推');
check('坐姿推胸 resolves to the machine guide', guides.exerciseGuideFor('坐姿推胸').name === '器械卧推');
check('史密斯机卧推 keeps its own guide', guides.exerciseGuideFor('史密斯机卧推').name === '史密斯机卧推');
check('a typo\'d dip name still finds the dip guide', guides.exerciseGuideFor('双臂杠屈伸').name === '双杠臂屈伸');
check('the machine guide does not borrow barbell cues', !/肩胛后收下沉/.test(guides.exerciseGuideFor('器械卧推').points.join('')));
check('the machine bench is one tap in the push presets', app.includes("push: ['卧推', '器械卧推',"));

// --- 记录：自重动作负重留空即可保存 ---------------------------------------------------------------------
check('bodyweight weight is optional on save', app.includes('(!bodyweight && set.weight === null)'));
check('the save error explains the split', app.includes('配重动作还要填负重，自重动作负重留空即可'));
check('reps are still required', app.includes('sets.some(set => number($(\'[data-set="reps"]\', set).value) === null'));
check('the set row marks bodyweight weight fields', app.includes("weight.placeholder = bodyweight ? '自重' : '—'"));
check('a stored 0 kg on a bodyweight move reads as empty', app.includes('return bodyweight && weight !== null && weight <= 0 ? null : weight;'));
check('plan hand-off normalises 0 kg too', app.includes('isBodyweightMove(name) && rawWeight !== null && rawWeight <= 0 ? null : rawWeight'));
check('the exercise foot shows bodyweight reps instead of a dash', app.includes("fmt(repsTotal, 0) + ' 次' : '—'"));
check('the save summary mentions bodyweight reps', app.includes("' · 自重 ' + fmt(stats.bodyweightReps, 0) + ' 次'"));
check('the post-session summary reports bodyweight reps', app.includes('自重 ${fmt(stats.bodyweightReps, 0)} 次（按次数计，不折算成 kg）'));

// --- 分析：概览与计划都认得自重 -------------------------------------------------------------------------
check('the weekly overview falls back to bodyweight reps', app.includes("totalVolume > 0 ? '本周容量' : totalBwReps > 0 ? '本周自重' : '本周容量'"));
check('the overview note carries bodyweight reps', app.includes("' · 自重 ' + fmt(totalBwReps, 0) + ' 次'"));
check('the bars keep one unit per chart', app.includes("const barMetric = totalVolume > 0 ? 'volume' : totalBwReps > 0 ? 'bw' : 'volume';"));
check('the weekly stats expose bodyweight reps', app.includes('totalBwReps: Math.round(days.reduce((sum, day) => sum + day.bwReps, 0))'));
check('the plan progresses bodyweight by reps', app.includes('return bodyweight && !deload ? Math.min(repsRange[1] + 2, reps + 1) : reps;'));
check('the plan note explains the bodyweight rule', app.includes('自重动作不加重，按次数进阶'));
check('bodyweight moves are not scheduled with a fake weight', app.includes('const bodyweight = typeof isBodyweightMove === \'function\' && isBodyweightMove(name);'));
// --- 用户手工标记的自重动作（2026-11-23 用户要求）----------------------------------------
check('训练行有「自重」标记按钮', app.includes('data-exercise-bodyweight') && app.includes('class="exercise-bodyweight"'));
check('点「自重」写入用户自重表并同步 prefs', app.includes('function setUserBodyweight(name, on)')
  && app.includes("schedulePrefsSync({bodyweightMoves: list})"));
check('isBodyweightMove 先查用户表', app.includes('if (USER_BODYWEIGHT.has(text)) return true;'));
check('自重表随备份走（注册表 + hydration）', app.includes("id: 'bodyweightMoves'")
  && app.includes('if (typeof loadUserBodyweightMarks === \'function\') loadUserBodyweightMarks();'));
check('点标记后该行重量格立刻改成自重', app.includes("notice(on ? '已记为自重动作：' + name")
  && app.includes('if (typeof refreshSetRow === \'function\') refreshSetRow(row);'));
// 回归：锁定展示态会把「自重」按钮 display:none 掉，而 focusout 早于 click，
// 行内失焦若立刻锁回去，按钮点击就丢了（2026-11-23 用户报「点改后自重按钮点不动」）。
check('行内失焦不锁回展示态（保住自重按钮的 click）', app.includes('const lockExerciseName = wrap =>')
  && app.includes('if (!next || wrap.contains(next)) return;'));
check('改为行外 pointerdown 才锁回展示态', app.includes("document.addEventListener('pointerdown', event => {")
  && app.includes("if (event.target.closest?.('.exercise-name-row')) return;"));
// 行为：用户标记后，同名动作在保存校验里被当成自重（允许空负重）。
const bwSource = [
  constLine(domain, 'BODYWEIGHT_MOVES'),
  constLine(domain, 'USER_BODYWEIGHT'),
  functionSource(domain, 'readBodyweightMarks'),
  functionSource(domain, 'loadUserBodyweightMarks'),
  functionSource(domain, 'isUserBodyweight'),
  functionSource(domain, 'setUserBodyweight'),
  functionSource(domain, 'isBodyweightMove'),
].join('\n');
const bwRun = new Function('localStorage', 'schedulePrefsSync',
  bwSource + '\nreturn {isBodyweightMove, setUserBodyweight};')({ getItem: () => null, setItem: () => {} }, () => {});
check('未标记前「绳索下压」不是自重', bwRun.isBodyweightMove('绳索下压') === false);
bwRun.setUserBodyweight('绳索下压', true);
check('标记后「绳索下压」算自重', bwRun.isBodyweightMove('绳索下压') === true);
bwRun.setUserBodyweight('绳索下压', false);
check('取消标记后又回到正则判断', bwRun.isBodyweightMove('绳索下压') === false);

// --- AI 排今天：器械动作要写清是哪种、自重不编重量 -------------------------------------------------------
check('the plan prompt names the bench variants', main.includes('卧推 / 器械卧推 / 史密斯机卧推 是三个不同动作'));
check('the plan prompt forbids inventing bodyweight loads', main.includes('自重动作（引体向上、俯卧撑、双杠臂屈伸）不要编造重量'));
check('changing the prompt bumps its version', /PROMPT_VERSION = 9;/.test(fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8')));
check('the record form still keeps cardio separate', html.includes('data-cardio="distance"') || app.includes('data-cardio="distance"'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-day-budget", async () => {
/**
 * Step 4 (part 1) checks: the day's own training flag drives which intake range the app uses, and the
 * reminder rules are stated plainly instead of being discoverable only by experiment.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

// --- training day drives the budget -----------------------------------------------------------------
check('an intake range is derived per date', app.includes('function intakeRangeForDate(date = activeDate, profileOverride = null)'));
check('a training day uses the training range', app.includes('min: useTraining ? trainingDay.min : restDay.min'));
check('a rest day uses the rest range', app.includes('max: useTraining ? trainingDay.max : restDay.max'));
// 2026-11-18：训练日不再读手填的「训练情况」，改成「当天有没有保存训练动作」。
check('an unmeasured profile says so instead of guessing', app.includes("'未测算：到「我的 → 身体档案与目标」补齐性别、身高、体重与年龄'"));
check('the missing profile is flagged on the range', app.includes('const unset = !active;') && app.includes('unset,'));
check('every diet goal drives the daily range', app.includes("goal: profile.goal,") && app.includes('goalLabel(profile.goal)'));
check('the goal plan falls back safely when incomplete', app.includes('plan && !plan.incomplete ? plan : null'));
check('the training flag is derived from the day\'s exercises', app.includes('const trained = typeof trainedOn === \'function\' ? !!trainedOn(date) : false;') && app.includes('function trainedOn(date)'));
check('and the day is trained when it has a named exercise', app.includes("return exercisesFor(date).some(item => item && String(item.name || '').trim());"));
check('the habit form no longer asks for training status', !html.includes('id="habit-training"') && !html.includes('训练情况'));
check('the effective profile carries the range', app.includes('profile.intakeRange = {min: range.min, max: range.max, basis: range.basis, trained: !!range.trained, unset: !!range.unset};'));
check('an unmeasured profile clears the stored ceiling', app.includes('profile.calorieTarget = range.unset ? null : range.max;'));
check('the stored day ranges are refreshed from the goal plan', app.includes('profile.trainingDayMin = range.trainingDay.min;'));
check('a one-day adjustment still overrides the ceiling', app.includes('if (adjustment) Object.assign(profile, adjustment.temporary);'));
// 断言更新登记（03-global-changes.md §5.1，2026-10-29）：C 节把区间降级成「目标单值 + ±2% 容差 + 依据」，
// 依据与数字必须同屏同源，所以断言的是一段代码里同时写入两者。
check('the hero shows one target with basis and tolerance', app.includes("$('#calorie-target').textContent = target === null ? '—' : fmt(target, 0);") && app.includes("' · ±2%'"));
check('the basis line names the day type from the range', app.includes("range.trained ? '按训练日' : '按休息日'"));
check('the range carries whether the day is trained', app.includes('profile.intakeRange = {min: range.min, max: range.max, basis: range.basis, trained: !!range.trained, unset: !!range.unset};'));
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
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-draft", async () => {
/**
 * 训练草稿解析器：真实执行断言（从产物里抽出函数源码，用 Node 跑）。
 * 覆盖：昨天跑步、力量组次重量、缺信息、计划类不触发、显式日期。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
// The live parser is parseDraft + the parseTrainingDraft wrapper ({payload:{exercises}} shape);
// the rich superseded copy was removed, so the test runs exactly what the app runs.
const start = app.indexOf('function parseTrainingDraft(');
if (start < 0) throw new Error('parseTrainingDraft not found');
const end = app.indexOf('\n  }', start);
const wrapper = app.slice(start, end + 4);
const parseStart = app.indexOf('function parseDraft(');
if (parseStart < 0) throw new Error('parseDraft not found');
const parseEnd = app.indexOf('\n  }', parseStart);
const parseSource = app.slice(parseStart, parseEnd + 4);
const movesStart = app.indexOf('const DRAFT_MOVES = [');
const movesEnd = app.indexOf('];', movesStart) + 2;
const movesSource = app.slice(movesStart, movesEnd);
const parse = new Function(movesSource + '\n' + parseSource + '\nreturn ' + wrapper)();

const BASE = '2026-10-22';
const run = parse('昨天跑了5km', BASE);
check('yesterday run is recognised', !!run && run.kind === 'training');
check('date resolves to yesterday', run.date === '2026-10-21', run.date);
check('distance parsed', run.payload.exercises[0].distanceKm === 5, String(run.payload.exercises[0].distanceKm));
check('missing duration flagged', run.missing.some(m => m.includes('时长')), run.missing.join(','));

const detailed = parse('昨天跑步 5 公里，用了 32 分钟', BASE);
check('duration parsed to minutes', detailed.payload.exercises[0].durationMin === 32, String(detailed.payload.exercises[0].durationMin));
check('nothing missing when complete', detailed.missing.length === 0, detailed.missing.join(','));

const bench = parse('今天卧推 4 组 8 次 60kg，还做了双杠臂屈伸 3 组 10 次', BASE);
check('strength parsed', bench && bench.kind === 'training');
check('two movements found', bench.payload.exercises.length === 2, JSON.stringify(bench.payload.exercises.map(e => e.name)));
check('sets/reps/weight read', bench.payload.exercises[0].sets === 4 && bench.payload.exercises[0].reps === 8 && bench.payload.exercises[0].weight === 60);
check('template guessed as push', bench.payload.template === 'push', bench.payload.template);
check('second movement keeps its own numbers', bench.payload.exercises[1].sets === 3 && bench.payload.exercises[1].reps === 10);

const missingReps = parse('今天深蹲 4 组', BASE);
check('missing reps flagged', missingReps.missing.some(m => m.includes('组数/次数')), missingReps.missing.join(','));

const planned = parse('明天打算练推，卧推几组合适？', BASE);
check('plans do not create a draft', planned === null);

const irrelevant = parse('我这两天蛋白质够吗？', BASE);
check('food questions are ignored', irrelevant === null);

const explicit = parse('10月19日跑步8公里', BASE);
check('explicit date parsed', explicit.date === '2026-10-19', explicit.date);

const legacy = parse('前天慢跑 3 公里', BASE);
check('day-before-yesterday works', legacy.date === '2026-10-20', legacy.date);

// 结构断言：确认卡片与写入路径
check('a confirm control exists', app.includes('data-draft-confirm'));
check('a cancel control exists', app.includes('data-draft-cancel'));
check('undo is offered after writing', app.includes('data-draft-undo'));
check('write merges with the day row', app.includes('exercises: [...existing, ...(draft.payload.exercises || [])]'));
check('the draft is shown before the answer', app.includes('if (draft) showTrainingDraft(draft); else renderTrainingDraft(null);'));
check('runs keep distance through their own inputs', app.includes('function cardioRowHtml(item)') && app.includes('data-cardio="distance"') && app.includes('data-cardio="minutes"'));
// 1.4.47 入口预算：问答页的「＋ 记一条训练」已删，记训练只留今日动作条与体检补记两处。
check('the duplicated chat training chip is gone', !app.includes('data-chat-train'));
// 1.4.47：问答页的「记一条训练」样例 chip 已删，草稿仍由输入框解析触发。
check('the draft still comes from parsing what the user typed', app.includes('let draft = parseTrainingDraft(question, activeDate);') && app.includes('draft = parseMealDraft(question, activeDate)') && app.includes('if (draft) showTrainingDraft(draft)') && !app.includes('data-chat-train'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-hierarchy", async () => {
/**
 * Training hierarchy: the decision line comes first; AI is a secondary text action;
 * the week strip is context, not a second hero.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('the training decision line is a 20px layer', css.includes('#training-advice-order .plan-sub{font-size:20px'));
check('the week strip heading is reduced to meta', css.includes('#week-plan .plan-sub{font-size:var(--text-xs)'));
check('today detail is an 18px focal line', css.includes('#week-detail{font-size:18px'));
check('the advice page no longer offers a second AI action', !app.includes('改用 AI 排今天'));
check('the primary adopt action remains', app.includes('data-today-adopt') && app.includes('采纳到今日清单'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-integration", async () => {
/**
 * 训练功能整合（2026-11-22 深夜）：四个已知问题各留一条断言，
 * 以后再动训练相关代码，先跑这个文件。
 *   ① 自重能存：原生校验对空负重放行
 *   ② 草稿不丢：训练表单按日期留内存草稿，重建时还原
 *   ③ 计划说明：搬抽屉不再父子同选，训练卡不再挂 note/timing
 *   ④ 计划按需要：split/gear/minutes 进生成器，起始部位接上一次训练的下一个
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const onboarding = read('app/src/fragments/68-training-log.fragment.js') + read('app/src/fragments/50-onboarding.fragment.js');
const training = read(DOMAIN_FILE) + read('app/src/fragments/60-training-copy.fragment.js');

// ① 自重能存
check('the native check allows an empty set weight', main.includes('if (weight != null && (weight < 0 || weight > 500))') &&
  !main.includes('if (weight == null || weight < 0 || weight > 500)'));
check('the JS side already allows it for bodyweight moves', onboarding.includes('const bodyweight = isBodyweightMove(item.name)') &&
  onboarding.includes('!bodyweight && set.weight === null'));

// ② 草稿不丢
check('a per-day draft store exists', onboarding.includes('const trainingDrafts = new Map()') && onboarding.includes('function rememberTrainingDraft()'));
check('the draft is captured on input and on set toggles', onboarding.includes("box.addEventListener('input', remember)") &&
  onboarding.includes("event.target.closest('[data-set-done], [data-set-add], [data-exercise-remove]')"));
check('a rebuild prefers the draft over saved rows', onboarding.includes('draft && draft.length ? draft :'));
check('the draft is dropped after saving and after clearing', onboarding.includes('forgetTrainingDraft();') &&
  read('app/src/fragments/68-training-log.fragment.js').includes('forgetTrainingDraft()'));
check('set rows restore their done state', onboarding.includes('set && set.done ? \' is-done\'') && onboarding.includes('done: set.done === true'));

// ③ 计划说明
check('the sheet move no longer picks the nested lead paragraph', app.includes('.plan-requirement, .plan-relation, .plan-why, .plan-label, .plan-load, .plan-load-note, .drift-line') &&
  !app.includes('.plan-why, .plan-why-lead'));
// 2026-11-23 Phase 3：教练说明与耗时不再搬进计划说明抽屉——它们留在训练日志工具栏下方，
// 点「重排今天」之后抬头就能看到。
check('the two note lines stay in the training log', html.includes('id="ai-plan-note"') && html.includes('id="ai-plan-timing"')
  && !app.includes("for (const id of ['ai-plan-note', 'ai-plan-timing'])"));

// ④ 计划按需要
check('the generator receives split, gear, minutes and a start template', app.includes('split: planPref.split, gear: planPref.gear, minutes: planPref.minutes') &&
  app.includes('startTemplate: nextStartTemplate(planPref.split)'));
check('the weekly sessions come from the preference, not only the profile', training.includes('number(planPref.days) || number(effectiveProfileForDate(activeDate).training)'));
check('templates follow the split', app.includes("split === 'ul' ? ['upper', 'lower'] : split === 'fb' ? ['full'] : ['push', 'pull', 'legs']"));
check('gear decides which movement wins a slot', app.includes("const gearKey = String(src.gear || 'mixed');") && app.includes('gearKey === \'mixed\' || item.gear === gearKey'));
check('minutes cap the density', app.includes('const moves = minutes <= 30 ? 3') && app.includes('const setCap = minutes <= 30 ? 3') && app.includes('const budget = Math.max(8, Math.round(minutes / 3.5));'));
check('每套模板都有固定槽位（主复合 + 次复合 + 孤立/核心）', app.includes('const PLAN_SHAPES = {') && app.includes("push: [{role: 'main'}, {role: 'compound'}"));
check('无历史的配重动作带推算重量', app.includes('plannedWeightFor === \'function\' ? plannedWeightFor(name) : null') && app.includes('weightApprox: true'));
check('处方次数与 RIR 取 GOAL_PRESETS', app.includes('const repsRange = goalPreset && Array.isArray(goalPreset.reps)') && app.includes('const rirRange = goalPreset && Array.isArray(goalPreset.rir)'));
check('生成结果带处方', app.includes('prescription: {reps: repsRange, rir: rirRange}'));
check('推算重量一路带到表单项（周计划播种）', app.includes('...(item.weightApprox ? {weightApprox: true} : {})') &&
  app.includes('day.exercises.map(item => ({name: item.name, sets: item.sets || 1, reps: item.reps || null, weight: item.weight ?? null,'));
check('采纳今日清单时也保留 weightApprox', app.includes('...(item.weightApprox ? {weightApprox: true} : {}),\n      reason'));
check('动作行会显示「约」标记', app.includes('class="exercise-approx"') && app.includes("item.weightApprox ? '<span class=\"exercise-approx\""));
check('the start template continues after the last session', app.includes('function nextStartTemplate(split)') &&
  app.includes("return at >= 0 ? order[(at + 1) % 3] : 'push';"));
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-library", async () => {
/**
 * 训练建议库断言：库本身的结构与内容，以及它被计划生成/分析真正用到。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const libText = fs.readFileSync('app/src/main/assets/training-principles.js', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

// 库在沙箱里执行，拿到真实对象
const lib = new Function('window', libText + '\nreturn window.TRAINING_PRINCIPLES;')({});
check('library loads', !!lib && typeof lib === 'object');
check('library has a version', typeof lib.version === 'string' && lib.version.length >= 8, lib.version);
check('six sources are cited', lib.sources.length >= 6, String(lib.sources.length));
check('every source has level and url', lib.sources.every(s => s.level && s.url), JSON.stringify(lib.sources.map(s => s.level)));
check('凯圣王 × 谭成义 is cited', lib.sources.some(s => s.label.includes('凯圣王') && s.label.includes('谭成义')));
check('ALEX channel is cited', lib.sources.some(s => s.label.includes('ALEX')));
check('好人松松 is cited', lib.sources.some(s => s.label.includes('好人松松')));
check('谭成义 own channel is cited', lib.sources.some(s => s.id === 'tcy-channel'));
const earlyIds = new Set(lib.rules.map(r => r.id));
check('new anatomy rules exist', ['joint-mobility-first','beginner-framework','diet-template-first','canteen-takeout','fatloss-playbook'].every(id => earlyIds.has(id)));
check('new movement rules exist', ['arm-isolation','shoulder-two-parts','abs-two-moves','breathing-recovery','solo-training'].every(id => earlyIds.has(id)));
check('every source is in the priority list', lib.sources.every(s => lib.priority.includes(s.id)));
const withVideo = lib.rules.filter(r => r.video);
check('most rules cite a video', withVideo.length >= 15, String(withVideo.length));
check('video refs look like bvids', withVideo.every(r => /^BV[0-9A-Za-z]{10}$/.test(r.video.bvid)), JSON.stringify(withVideo.slice(0, 2).map(r => r.video.bvid)));
check('video refs carry a duration', withVideo.every(r => Number(r.video.seconds) > 0));
check('digest includes the video reference', app.includes("'（视频 ' + rule.video.bvid"));
check('the advice prompt no longer asks for BV citations', (function(){const p=fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java','utf8'); return !p.includes('BV 号与时长')})());

check('rules are plentiful', lib.rules.length >= 14, String(lib.rules.length));
check('every rule has id/topic/claim/source/confidence', lib.rules.every(r => r.id && r.topic && r.claim && r.source && r.confidence));
check('every rule source exists', lib.rules.every(r => lib.sources.some(s => s.id === r.source)));
check('rule ids are unique', new Set(lib.rules.map(r => r.id)).size === lib.rules.length);

const ids = new Set(lib.rules.map(r => r.id));
for (const id of ['split-3-rationale', 'main-lift-rpe8', 'isolation-failure', 'deload-rule', 'leg-front-squat', 'pull-trap-balance', 'no-four-days', 'fatigue-monitor']) {
  check('rule present: ' + id, ids.has(id));
}
check('RPE 8 rule carries a number', lib.rules.find(r => r.id === 'main-lift-rpe8').claim.includes('RPE 8'));
check('力竭 rule distinguishes compound vs isolation', lib.rules.find(r => r.id === 'isolation-failure').claim.includes('单关节'));
check('deload parameters exist', lib.rules.find(r => r.id === 'deload-rule').plan.loadFactor === 0.9);

// 建议动作
for (const template of ['push', 'pull', 'legs']) {
  const moves = lib.moves[template];
  check('moves for ' + template, Array.isArray(moves) && moves.length >= 4, String(moves && moves.length));
  check(template + ' moves have name/sets/reps', moves.every(m => m.name && m.sets && m.reps));
}
check('push includes a bench press', lib.moves.push.some(m => m.name.includes('卧推')));
check('pull includes a chest-supported row', lib.moves.pull.some(m => m.name.includes('海豹划船')));
check('legs includes front squat', lib.moves.legs.some(m => m.name.includes('颈前深蹲')));

// 接入
check('the library loads before the app', html.indexOf('training-principles.js') < html.indexOf('app.js'));
check('helpers exist in the bundle', app.includes('function trainingLibrary()') && app.includes('function libraryMoves(template)'));
check('planWhy exists', app.includes('function planWhy(input)'));
check('templates draw their movements from the library', app.includes("typeof libraryDayTemplate === 'function'") && app.includes("typeof libraryMoves === 'function'") && app.includes('if (libList && libList.length)'));
check('days carry suggested', app.includes('exercises: picked.exercises, suggested: picked.suggested'));
check('the plan carries reasons', app.includes("typeof planWhy === 'function' ? planWhy("));
check('the card renders the explanation', app.includes('为什么这样排') && app.includes('plan-why'));
check('suggested movements are labelled', app.includes("planDay.suggested ? '（训练库建议）' : ''"));

// planWhy 真实执行
const fnStart = app.indexOf('function planWhy(');
const fnEnd = app.indexOf('\n  }', fnStart);
const whySource = app.slice(fnStart, fnEnd + 4);
const helpers = app.slice(app.indexOf('function trainingLibrary()'), app.indexOf('/** Why this week looks like this'));
const runWhy = new Function('window', helpers + '\n' + whySource + '\nreturn planWhy;')({TRAINING_PRINCIPLES: lib});
const normal = runWhy({deload: false, suggested: false});
const deload = runWhy({deload: true, suggested: true});
check('normal week cites the 3-split rule', normal.some(r => r.id === 'split-3-rationale'));
check('normal week cites RPE 8', normal.some(r => r.id === 'main-lift-rpe8'));
check('deload week cites the deload rule', deload.some(r => r.id === 'deload-rule'));
check('deload week does not claim a 3-split rationale', !deload.some(r => r.id === 'split-3-rationale'));
check('reasons carry a source label', normal.every(r => r.source && r.source.length > 4), JSON.stringify(normal.map(r => r.source)));


// --- the fallback really runs (library + generator in one sandbox) ---------------------------------
const genStart = app.indexOf('function generateWeekPlan(');
const genEnd = app.indexOf('\n  }', genStart);
const genSource = app.slice(genStart, genEnd + 4);
const runPlan = new Function('window', helpers + '\n' + whySource + '\n' + genSource
  + '\n' + constSource(readDomain(), 'BODY_PART_RULES') + '\n' + functionSource(readDomain(), 'exerciseBodyPart')
  + '\nreturn generateWeekPlan;')({TRAINING_PRINCIPLES: lib});
const emptyPlan = runPlan({startDate: '2026-10-26', sessions: 3, acwrFlag: 'ok', lastByExercise: {}});
const pushDay = emptyPlan.days.find(day => day.template === 'push');
check('empty history still gets a push day', !!pushDay);
check('its movements come from the library', pushDay && pushDay.exercises.some(item => item.name.includes('卧推')), JSON.stringify(pushDay && pushDay.exercises.map(e => e.name)));
check('those days are marked suggested', pushDay && pushDay.suggested === true);
check('the plan explains itself', Array.isArray(emptyPlan.reasons) && emptyPlan.reasons.length >= 3);


// --- v2：优先级、减脂主题、建议链路 ---------------------------------------------------------------
check('priority order is declared', Array.isArray(lib.priority) && lib.priority.length >= 6, JSON.stringify(lib.priority));
check('priority starts with the chinese guide', lib.priority[0] === 'cdg-2022');
check('sources carry a priority number', lib.sources.every(s => Number.isFinite(s.priority)));
check('a conflict policy exists', typeof lib.conflictPolicy === 'string' && lib.conflictPolicy.includes('App 规则'));
check('topics index exists', Array.isArray(lib.topics) && lib.topics.length >= 6, String(lib.topics && lib.topics.length));
const topics = new Set(lib.rules.map(r => r.topic));
for (const topic of ['训练结构', '减脂执行', '饮食配合', '有氧']) check('topic covered: ' + topic, topics.has(topic));
for (const id of ['deficit-cap', 'protein-preserve', 'weekly-rate', 'plateau-check', 'sleep-deficit', 'cardio-dose', 'neat-first', 'refeed-day', 'meal-protein-spread']) {
  check('reduction rule present: ' + id, ids.has(id));
}
check('the hard floor is restated, not relaxed', lib.rules.find(r => r.id === 'deficit-cap').claim.includes('不得低于硬底线'));
check('protein rule keeps the app range', lib.rules.find(r => r.id === 'protein-preserve').plan.proteinPerKg[1] === 2.4);
check('rules are plentiful in v2', lib.rules.length >= 24, String(lib.rules.length));
check('verified recovery rules exist', ['stretch-after-training','foam-roll-legs','desk-neck-release'].every(id => ids.has(id)));
check('season episodes are recorded', Array.isArray(lib.sources[0].episodes) && lib.sources[0].episodes.length === 7);
const alexSource = lib.sources.find(s => s.id === 'alex-channel');
check('ALEX episodes are recorded', Array.isArray(alexSource.episodes) && alexSource.episodes.length >= 3);
check('the ALEX correction is written down', alexSource.note.includes('第三方'));


// --- 评论区课代表整理图：日模板 ---------------------------------------------------------------
check('day templates from the comment digest', !!lib.dayTemplates && ['push', 'pull', 'legs'].every(k => !!lib.dayTemplates[k]));
for (const key of ['push', 'pull', 'legs']) {
  const day = lib.dayTemplates[key];
  check(key + ' template has five movements', Array.isArray(day.exercises) && day.exercises.length === 5, String(day.exercises && day.exercises.length));
  check(key + ' movements carry sets/reps/rpe', day.exercises.every(e => e.name && e.sets && e.reps && e.rpe), JSON.stringify(day.exercises.map(e => e.name)));
  check(key + ' template has a warmup', Array.isArray(day.warmup) && day.warmup.length >= 2);
}
check('push starts with the bench press', lib.dayTemplates.push.exercises[0].name === '杠铃卧推');
check('pull starts with the single-arm pulldown', lib.dayTemplates.pull.exercises[0].name === '单手钢线下拉');
check('legs starts with the single-leg deadlift', lib.dayTemplates.legs.exercises[0].name === '单腿硬拉');
check('the row targets mid/lower traps after the correction', lib.dayTemplates.pull.exercises.some(e => e.name === '坐姿开肘划船' && e.role.includes('中下斜方')));
check('the digest source is registered', lib.sources.some(s => s.id === 'community-digest'));
check('the digest note records the on-video slip', lib.sources.find(s => s.id === 'community-digest').note.includes('口误'));
check('the digest rules exist', ['push-day-template','pull-day-template','legs-day-template','rest-pause-isolation','warmup-legs-detailed'].every(id => ids.has(id)));
check('the generator uses the day templates', app.includes('libraryDayTemplate(template)') && app.includes('function libraryDayTemplate(template)'));
// 2026-11-18：周条取代 7 行表格后，RPE 不再有逐行展示位；断言改为守「生成的计划里带着 RPE」。
check('planned items carry RPE', app.includes('rpe: item.rpe || null'));

check('the reference prescriptions block is gone', !app.includes('参考处方') && !app.includes('plan-ref'));

// --- ASR 口述级规则（A 级） ---------------------------------------------------------------
check('asr transcript rules', lib.sources.some(s => s.id === 'asr-transcript'));
const asr = lib.sources.find(s => s.id === 'asr-transcript');
check('asr source cites five videos', Array.isArray(asr.episodes) && asr.episodes.length === 5, String(asr.episodes && asr.episodes.length));
check('asr source is level A', asr.level.startsWith('A'));
check('asr rules carry timestamps', lib.rules.filter(r => r.evidence).length >= 8, String(lib.rules.filter(r => r.evidence).length));
check('timestamps look like mm:ss', lib.rules.filter(r => r.evidence).every(r => /^\d{2}:\d{2}$/.test(r.evidence.at)));
check('abs rules from the transcript', ['abs-endurance-training','abs-two-moves-detail','abs-stretch-before'].every(id => earlyIds.has(id)));
check('shoulder cues from the transcript', ['lateral-raise-partial','rear-delt-neutral-grip'].every(id => earlyIds.has(id)));
check('RPE 8 is not RM', lib.rules.find(r => r.id === 'rpe8-is-not-rm').claim.includes('不是 RM'));
check('the leg warmup has six moves at 45s', lib.rules.find(r => r.id === 'leg-warmup-six-moves').plan.secondsPerSide === 45);
check('the library cites at least thirteen sources', lib.sources.length >= 13, String(lib.sources.length));
check('priority covers the transcript source', lib.priority.includes('asr-transcript'));


// --- 问答检索与训练卡要点 ---------------------------------------------------------------------
check('topic routing exists', app.includes('const LIBRARY_ROUTES') && app.includes('function libraryLookup(question'));
check('the question routes to the right rules', app.includes('libraryLookup(question, 8)'));
check('cues exist per template', app.includes('function libraryCues(template)') && app.includes("legs: ['leg-warmup-six-moves'"));
check('the plan no longer renders a cue block; cues live behind ?', !app.includes('plan-cue-') && app.includes('libraryCuesFor'));
// 2026-11-17：要点与理由都要跟着「那天实际要做的动作 / 用户排的那份清单」走。
check('cues follow the actual exercises', app.includes('function libraryCuesFor(day)') && app.includes('function cueForExercise(name, family)'));
check('cue lookup still names each movement', app.includes('function libraryCuesFor(day)') && app.includes('cueForExercise('));
// 2026-11-19：块里不再重复 AI 的逐动作理由（会与预览日期脱节），理由改由「今日顺序」每行承担。
check('AI 的理由只存在数据里，不再有独立理由块', !app.includes('ai-plan-reason') && !app.includes('plan-why-ai'));
check('the overview animates its bars', app.includes('const animateBars =') && app.includes('transitionDelay'));
check('the rest timer is a floating pill', app.includes('function syncRestDock()') && app.includes('function installRestDock()'));

// really run the routing: 腹肌 → abs rules, 减脂 → fatloss rules
const routeStart = app.indexOf('const LIBRARY_ROUTES');
const routeEnd = app.indexOf('/** Which library rule answers the weakest metric');
const routeSource = app.slice(routeStart, routeEnd);
const runLookup = new Function('window', 'trainingLibrary',
  routeSource + '\nreturn {libraryLookup, libraryCues};')({TRAINING_PRINCIPLES: lib}, () => lib);
const absHits = runLookup.libraryLookup('腹肌怎么练才对', 5);
check('腹肌 question returns abs rules', absHits.includes('腹肌') && absHits.includes('悬垂举腿'), absHits.slice(0, 60));
const fatHits = runLookup.libraryLookup('减脂平台期怎么办', 5);
check('减脂 question returns fatloss rules', fatHits.includes('平台') || fatHits.includes('缺口'), fatHits.slice(0, 60));
const sleepHits = runLookup.libraryLookup('最近睡眠不好很累', 5);
check('sleep question returns recovery rules', sleepHits.includes('睡眠') || sleepHits.includes('晨脉'), sleepHits.slice(0, 60));
check('unrelated question returns nothing', runLookup.libraryLookup('今天天气怎么样', 5) === '');
const cues = runLookup.libraryCues('legs');
check('leg cues cite the six-move warmup', cues.some(c => c.includes('6 个动作') || c.includes('45 秒')), JSON.stringify(cues));


// --- 解剖手册（第 1~3 集）与模板校准 ---------------------------------------------------------
check('anatomy rules from the handbook', ['joint-motion-map','judge-by-resistance-phase','bench-grip-decides-motion','shoulder-flexion-muscles'].every(id => earlyIds.has(id)));
check('chest rules from the handbook', ['elbow-angle-selects-chest','fake-decline-habit','dips-serratus'].every(id => earlyIds.has(id)));
check('shoulder rules from the handbook', ['lateral-raise-elbow-bend','upper-trap-participates','rear-delt-row-must-flare','scapular-retraction-error'].every(id => earlyIds.has(id)));
check('the bench grip rule names both motions', lib.rules.find(r => r.id === 'bench-grip-decides-motion').plan.wide === 'horizontal-adduction');
check('the fake decline rule names the habit', lib.rules.find(r => r.id === 'fake-decline-habit').plan.avoid.includes('过度挺胸'));
for (const key of ['push', 'pull', 'legs']) {
  const day = lib.dayTemplates[key];
  check(key + ' template carries cues', Array.isArray(day.cues) && day.cues.length >= 3, String(day.cues && day.cues.length));
}
check('the push cue mentions the elbow angle', lib.dayTemplates.push.cues.some(c => c.includes('开肘')));
check('the pull cue mentions horizontal flare', lib.dayTemplates.pull.cues.some(c => c.includes('水平开肘')));
check('the legs cue mentions the six-move warmup', lib.dayTemplates.legs.cues.some(c => c.includes('45 秒')));
check('the card shows the body-part hints', app.includes('function bodyPartHints') && app.includes('按部位查解剖要点'));
check('day-template cues stay as data, not UI', !app.includes('day.cues.map') && !!lib.dayTemplates
  && Object.values(lib.dayTemplates).some(day => Array.isArray(day.cues) && day.cues.length));

const rich = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js', 'utf8');
const carbStart = rich.indexOf('function carbCap');
const carbFn = rich.slice(carbStart, rich.indexOf('\n  }', carbStart) + 4);
check('carbCap falls back to the range max', carbFn.includes('number(range && range.max)'));
const runCarb = new Function('number', carbFn + '\nreturn carbCap;')(v => v === null || v === undefined || v === '' ? null : Number(v));
check('carb limit renders without calorieTarget', runCarb({proteinMax: 155, fatMax: 70}, {max: 2314}) === 266, String(runCarb({proteinMax: 155, fatMax: 70}, {max: 2314})));
check('carb limit uses calorieTarget when present', runCarb({calorieTarget: 2000, proteinMax: 140, fatMax: 60}, {max: 2314}) === 225, String(runCarb({calorieTarget: 2000, proteinMax: 140, fatMax: 60}, {max: 2314})));
check('the app notes inferred carbs', fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8').includes('已按剩余热量反推'));
const rest = fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8');
const carbStart2 = rest.indexOf('function carbOfItem');
const carbEnd2 = rest.indexOf('\n  }', carbStart2) + 4;
const runItemCarb = new Function('number', rest.slice(carbStart2, carbEnd2) + '\nreturn carbOfItem;')(v => v === null || v === undefined || v === '' ? null : Number(v));
check('preview infers missing carbs', runItemCarb({calories: 261, protein: 5.3, fat: 0.6, carbs: 0}) === 58.6, String(runItemCarb({calories: 261, protein: 5.3, fat: 0.6, carbs: 0})));
check('preview keeps a stated carb value', runItemCarb({calories: 261, protein: 5.3, fat: 0.6, carbs: 57}) === 57);
check('preview leaves protein/fat-only rows alone', runItemCarb({calories: 40, protein: 8, fat: 1, carbs: null}) === 0);
check('back rules from the handbook', ['traps-grow-by-retraction','row-scapula-depends-on-goal','teres-major-is-small-lat','scapular-depression-before-pull'].every(id => earlyIds.has(id)));
check('the traps rule names the retraction movement', lib.rules.find(r => r.id === 'traps-grow-by-retraction').plan.movement === 'scapular-retraction');
check('the teres rule keeps the alias', lib.rules.find(r => r.id === 'teres-major-is-small-lat').plan.alias === '小背阔肌');
check('the library now holds the five-episode batch', lib.rules.filter(r => r.evidence && r.evidence.bvid === 'BV1jEnuz9ESc').length >= 4);
check('arm rules from the handbook', ['biceps-long-head-dual-joint','long-head-stretch-myth','triceps-heads-crossing','abs-blocks-are-genetic'].every(id => earlyIds.has(id)));
check('the myth rule is marked unproven', lib.rules.find(r => r.id === 'long-head-stretch-myth').plan.status === 'unproven');
check('every anatomy episode is cited', ['BV1mM6JY6Ei9','BV1YgcdeqE7y','BV167LAzaE14','BV1jEnuz9ESc','BV1X1Lj66ENe'].every(b => lib.rules.some(r => r.evidence && r.evidence.bvid === b)));
check('the library holds the whole handbook batch', lib.rules.filter(r => r.evidence).length >= 25, String(lib.rules.filter(r => r.evidence).length));
check('guideline citations', ['issn-2017','helms-2014','aasm-2015'].every(id => lib.sources.some(s => s.id === id)));
check('the protein range matches the stand', lib.rules.find(r => r.id === 'protein-general-range').claim.includes('1.4~2.0'));
check('the deficit protein band is cited', lib.rules.find(r => r.id === 'protein-deficit-range').plan.deficitRange[1] === 3.1);
check('per-meal protein is cited', lib.rules.find(r => r.id === 'protein-per-meal').plan.perMealG[1] === 40);
check('sleep consensus cites seven hours', lib.rules.find(r => r.id === 'sleep-duration-consensus').plan.minHours === 7);
check('formula error is acknowledged', lib.rules.find(r => r.id === 'tdee-formula-error').plan.formulaErrorPercent[1] === 20);
check('guideline rules carry a citation object', lib.rules.filter(r => r.citation).length >= 8, String(lib.rules.filter(r => r.citation).length));
check('the app has design tokens', fs.readFileSync('app/src/main/assets/styles.css','utf8').includes('--space-4:16px'));
check('chinese guideline rules', ['cdg-salt-oil-sugar','cdg-veg-fruit-dairy','cdg-protein-foods','cdg-staple-variety','cdg-activity-week','cdg-water','cdg-eating-out','cdg-oil-fits-fat-floor','csr-average-seven-four'].every(id => earlyIds.has(id)));
check('the salt limit is five grams', lib.rules.find(r => r.id === 'cdg-salt-oil-sugar').plan.saltG === 5);
check('oil is 25 to 30 grams', lib.rules.find(r => r.id === 'cdg-salt-oil-sugar').plan.oilG[1] === 30);
check('weekly activity is 150 minutes', lib.rules.find(r => r.id === 'cdg-activity-week').plan.moderateMinutes === 150);
check('the sleep report figure is recorded', lib.rules.find(r => r.id === 'csr-average-seven-four').plan.meanHours === 7.4);
check('the oil rule reconciles the fat floor', lib.rules.find(r => r.id === 'cdg-oil-fits-fat-floor').plan.fatFloorG === 55);
check('obesity guidance rules', ['cswz-energy-deficit','cswz-macro-split','cswz-loss-rate','cswz-activity-dose','cswz-sleep-seven-23','cswz-food-portions','cswz-meal-order','cswz-oil-salt-tight','cswz-alcohol-cost','cswz-scope-vs-app-floor'].every(id => earlyIds.has(id)));
check('the guide keeps the app floor separate', lib.rules.find(r => r.id === 'cswz-scope-vs-app-floor').plan.appFloor === 2000);
check('the loss rate is 0.5 to 1 kg a week', lib.rules.find(r => r.id === 'cswz-loss-rate').plan.weeklyKg[1] === 1);
check('cardio is 150 to 300 minutes', lib.rules.find(r => r.id === 'cswz-activity-dose').plan.cardioMinutes[1] === 300);
check('meal order starts with vegetables', lib.rules.find(r => r.id === 'cswz-meal-order').plan.order[0] === '蔬菜');
check('alcohol is seven kcal a gram', lib.rules.find(r => r.id === 'cswz-alcohol-cost').plan.kcalPerGram === 7);
const cssText = fs.readFileSync('app/src/main/assets/styles.css','utf8');
check('metrics use tabular numbers', cssText.includes('font-variant-numeric:tabular-nums'));
check('reduced motion is respected', cssText.includes('prefers-reduced-motion'));
check('focus is visible', cssText.includes(':focus-visible'));
check('the design notes are recorded', typeof lib.designNotes === 'object' && lib.designNotes.basis.length > 10);
const frags = fs.readdirSync('app/src/fragments').map(f => fs.readFileSync('app/src/fragments/' + f, 'utf8')).join('\n');
check('empty states all go through the component', !/<p>目前记录不足/.test(frags) && !/还没有可复制的餐食记录。'<\/span>/.test(frags) && !/没有匹配结果。/.test(frags));
check('the component has a title and hint', frags.includes('empty-title') && frags.includes('empty-hint'));
check('the component is used in at least six places', (frags.match(/empty\(/g) || []).length >= 6, String((frags.match(/empty\(/g) || []).length));
const sheet = fs.readFileSync('app/src/main/assets/styles.css','utf8');
check('the four type levels exist', ['.t-page','.t-card','.t-body','.t-note'].every(c => sheet.includes(c)));
check('smallest text is readable', !/font-size:\s*(9|10|10\.5|11\.5|12)px/.test(sheet));
check('form controls inherit the body font', /button,input,select,textarea\{font-family:var\(--font-ui\)/.test(sheet));
check('every font family goes through a token', (sheet.match(/font-family:\s*(?!var\(--font-)/g) || []).length === 0, String((sheet.match(/font-family:\s*(?!var\(--font-)/g) || []).length));
const sheet2 = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const skinBlock = (sheet2.match(/\[data-skin="ledger"\]\{([\s\S]*?)\}/) || [])[1] || '';
const baseBlock = (sheet2.match(/:root\{([\s\S]*?)\}/) || [])[1] || '';
const required = ['--paper','--surface','--line','--ink','--body-text','--muted','--radius-lg','--measure'];
check('both skins define the same tokens', required.every(k => baseBlock.includes(k + ':') && (skinBlock.includes(k + ':') || k === '--measure')), required.filter(k => !skinBlock.includes(k + ':')).join(','));
check('the skin switcher exists', frags.includes('installSkinPicker') && frags.includes('data-skin-pick'));
check('the skin persists', frags.includes("localStorage.setItem(SKIN_KEY"));
check('ledger swaps the display font for sans', /\[data-skin="ledger"\][\s\S]{0,400}--font-display:var\(--font-ui\)/.test(sheet2));
const appJs = fs.readFileSync('app/src/main/assets/app.js','utf8');
const idxHtml = fs.readFileSync('app/src/main/assets/index.html','utf8');
check('the glossary covers core terms', ['RPE','RM','ACWR','TDEE','减载','渐进超负荷','力竭'].every(k => appJs.includes('"' + k + '": {full:')));
check('terms are annotated wherever cues are shown', appJs.includes('annotateTerms(') && appJs.includes('annotateTerms(esc(cue.text))') === false);
check('the term sheet can be closed', appJs.includes('installTermSheet') && appJs.includes('term-close'));
check('photo entries follow the skin', cssText.includes('.photo-add:active{background:var(--surface-soft)}') && cssText.includes('.sheet-option:active{background:var(--accent-soft)}'));
check('the weight calculator handles per-side input', appJs.includes('weight-per-side') && appJs.includes('weight-fill'));
check('the credits block lists the channels', idxHtml.includes('id="credits"') && idxHtml.includes('space.bilibili.com/2100737396') && idxHtml.includes('space.bilibili.com/521903482') && idxHtml.includes('space.bilibili.com/2078781964'));
check('training tabs disappear in the no-training mode', appJs.includes('[data-records-panel=\"training\"]') && appJs.includes('[data-trends-panel=\"training\"]'));
check('the AI plan uses the shared external consent', !appJs.includes('id="ai-plan-consent"') && appJs.includes('externalConsent()'));
check('the AI plan parses JSON only', appJs.includes('function parseAiPlanReply') && appJs.includes('JSON.parse(slice)'));
check('the AI plan stores per day', appJs.includes('qingheng.aiPlan.'));
check('the term sheet exists', idxHtml.includes('id="term-sheet"') && appJs.includes('function openTerm'));
check('every term has a caution', (appJs.match(/caution: "/g) || []).length >= 7, String((appJs.match(/caution: "/g) || []).length));
check('the notes collapse exists', idxHtml.includes('class="card-notes"'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-log", async () => {
/**
 * Step 6 checks: the training log keeps one habit row per day, volume is computed honestly, and the
 * progressive-overload view refuses to compare a single week.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

// --- the log UI ---------------------------------------------------------------------------------------
check('the training card exists', html.includes('<article class="card" id="training-log">'));
check('the three templates from the written plan exist', html.includes('value="push"') && html.includes('value="pull"') && html.includes('value="legs"'));
check('template labels match the training plan', html.includes('推（胸肩三头）') && html.includes('拉（背二头）') && html.includes('腿（下肢核心）'));
// 断言更新登记（03-global-changes.md §5.1，2026-11-11）：逐组模型落地后，动作行不再有
// 「组数」字段（组数 = 组行数），断言语义不变（一行仍要能写次与负重），只跟到现役控件。
check('an exercise row asks for sets, reps and weight', html.includes('id="training-exercises"') && app.includes('data-exercise="name"') && app.includes('data-set="reps"') && app.includes('data-set="weight"'));
// 断言更新登记（同上）：12 个动作的上限改为走 appendExerciseRow，返回值从 undefined 变 null。
check('up to twelve exercises are allowed', app.includes("if (index >= 12) {notice('一次最多记录 12 个动作。', true); return null;}"));
// 断言更新登记（03-global-changes.md §5 第 3 条）：实现从「整表单一次性拒绝」改为
// 「逐字段 aria-invalid + 聚焦第一个缺失项」，语义未变，故改断言到现役实现。
check('an incomplete exercise is refused instead of stored',
  app.includes("markFieldInvalid(field, '请补全这一组。')")
  && app.includes("'每个动作至少一组、每组填次数；配重动作还要填负重，自重动作负重留空即可。'")
  && app.includes('missing[0]?.focus();'));
check('saving marks the day as trained', app.includes('await api(\'/api/habits\', {...existing, date: activeDate, training: true, template:'));
check('the log keeps other fields of the day row', app.includes('const existing = habitRowFor(activeDate) || {};'));
check('clearing keeps the rest of the day row', app.includes('习惯行的其他数据（步数、睡眠、饮水、用油）会保留'));
check('the tag summarises what is logged', app.includes('`${TRAINING_TEMPLATES[template]} · ${exercises.length} 个动作`'));

// --- one row per day ------------------------------------------------------------------------------------
check('a habit-row lookup exists', app.includes('function habitRowFor(date)'));
check('duplicate rows are resolved by keeping the fullest', app.includes('rows.slice().sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0]'));
check('the habit submit merges into the same-day row instead of appending', app.includes("return {...(habitRowFor(form.elements.date.value)||{}), date:form.elements.date.value, ...filled};"));
check('the training log reads back the stored exercises', app.includes('function exercisesFor(date)'));

// --- volume maths -----------------------------------------------------------------------------------------
// 2026-11-23 Phase 2：唯一口径是逐组 reps×weight（trainingVolumeOf），旧的 exerciseVolume 已删。
check('volume is summed per set', app.includes('if (reps !== null && weight !== null && weight > 0) volume += reps * weight;'));
check('old records still fall back to sets × reps × weight', app.includes('if (sets !== null && reps !== null && weight !== null && weight > 0) volume += sets * reps * weight;'));
check('volume groups by ISO week', app.includes("monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));"));
check('at least two weeks are required before comparing', app.includes('if (ordered.length < 2) continue;'));
check('the table explains what volume means', app.includes('容量 = 组数 × 次数 × 负重'));
check('the empty state explains what is missing', app.includes('同一动作至少需要两周的训练记录'));
check('the table is rendered with the trends view', app.includes('    renderVolumeTable();'));

// --- native validation --------------------------------------------------------------------------------------
check('the template is validated natively', main.includes('训练模板只能是推、拉、腿或其他'));
check('the exercise count is bounded natively', main.includes('if (exercises.length() > 12) throw fail("一次最多记录 12 个动作");'));
check('an exercise name is required', main.includes('动作名称不能为空，且不超过 60 字'));
check('sets, reps and weight are bounded natively', main.includes('key.equals("sets") ? 30 : key.equals("reps") ? 200 : 500'));
check('habit validation runs for every habit save', main.includes('if (collection.equals("habits")) requireHabitFields(record);'));


// --- today plan list: one place owns the plan semantics -----------------------------------------------
check('the today list speaks plan semantics, not log semantics', app.includes('今日清单 · ') && !app.includes('按这个顺序练'));
check('the today list mirrors the AI plan with done checkboxes', app.includes('data-today-done=') && app.includes('data-today-add-all'));
// 源码里的属性引号是转义的（\"ai\"），断言不能按字面量比对。
check('an empty day offers two generators', /data-today-plan=\\?"ai\\?"/.test(app) && /data-today-plan=\\?"week\\?"/.test(app));
// 2026-11-23 Phase 2：AI 清单的独立渲染/编辑（#ai-plan-list 等）整体移除，理由不再常驻行内。
check('AI 清单理由不再常驻行内（改走动作要点）', !app.includes('ai-plan-reason') && app.includes('showExerciseGuide'));
check('今日清单每行是名字 + 剂量 + 记录，且仍是唯一一份', app.includes('adv-name') && app.includes('adv-dose') && app.includes('data-today-log='));
// 2026-11-23 Phase 2：AI 清单的独立渲染 / 编辑（#ai-plan-list 等节点早已不在 index.html）整体移除。
// 这里改为守住「只剩一份清单」这个契约，以及清空训练的抑制标记改成持久化快照。
check('今日清单是唯一清单（AI 清单的重复渲染与编辑已移除）',
  !app.includes('data-ai-append') && !app.includes('ai-plan-edit-reason') && !app.includes('data-ai-swap') && !app.includes('data-ai-log='));
check('清空训练按清单快照抑制播种，刷新不复活', app.includes('function markSeedMuted(plan)') && app.includes('seedMutedFor(planNow)'));
check('askAiPlan sees the same baselines as the rule engine', app.includes('function recentExerciseBaselines') && app.includes('compilePlanContext(activeDate)'));
check('askAiPlan follows the training library', /askAiPlan[\s\S]{0,6000}librarySummary\(2\)/.test(app));

check('AI plan fills missing weights from the last recorded set', app.includes('function planWeightFor') && app.includes('plannedWeightFor(row && row.name)'));check('run km/minutes come from the cardio inputs, not inheritance', app.includes('data-cardio="distance"') && !app.includes('runsByName'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-plan-loop", async () => {
/**
 * 勾选即记录 + 名称看要点 + 休息条挂卡底 + 视觉识读统一契约（2026-11-22 第七轮，1.5.21）。
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

// --- 勾选即记录 ------------------------------------------------------------------------
check('the checkbox writes a log entry', app.includes('function togglePlanDone') && /togglePlanDone\(index, done\.checked\)/.test(app));
check('the write path keeps the plan row visible', app.includes('keepInPlan: true') && app.includes('fromPlan: true'));
check('the added row carries a fromPlan marker', app.includes('if (options.fromPlan === true) record.fromPlan = true;'));
check('unchecking only reclaims untouched rows', app.includes('function removeExerciseFromToday') &&
  app.includes('current.fromPlan === true') && app.includes('setDetails') );
check('a failed write rolls the checkbox back', /done\.checked = !done\.checked/.test(app));

// --- 名称看要点 / 休息条 ---------------------------------------------------------------
check('the name row is display + edit, not a hidden field', htmlless(app));
check('the old 要点 button is gone', !app.includes('data-exercise-help'));
check('the rest strip sits at the card foot', /const foot = \$\('\.set-foot', exerciseRow\);[\s\S]{0,80}foot\.before\(line\)/.test(app));

// --- 视觉识读统一契约 ------------------------------------------------------------------
check('one normaliser for both OCR entries', app.includes('function normaliseVision') &&
  app.includes("normaliseVision(data, 'scale')") && app.includes("normaliseVision(data, 'meal')"));
check('out-of-range fields are rejected, not clamped', app.includes('VISION_FIELD_LIMITS') && app.includes('out.rejected.push'));
check('the meal path still asks for confirmation before saving', app.includes('请在下方修改并确认，才会保存'));
check('one clear OCR entry covers screenshot and photo', html.includes('识别体脂秤截图 / 照片') && !html.includes('id="scale-shot"'));

// --- 质感 ------------------------------------------------------------------------------
check('the three capsules carry the same-family gradient', /\.quick-chip\{[^}]*linear-gradient\(160deg/.test(css.replace(/\n/g, ' ')));
check('the single action line sits inside the energy card without its own frame', css.includes('.today-action{display:flex;align-items:center;gap:8px;min-height:48px') && !css.includes('.slot-hint'));

check('the fromPlan marker survives a form rebuild', app.includes('const carried = (typeof exercisesFor === \'function\' ? exercisesFor(activeDate) : [])') && /\.\.\.fromPlan, id, name/.test(app));
check('untouched compares set numbers against the plan prescription', app.includes('const sameAsPlan = !Array.isArray(current?.setDetails)') && app.includes('=== (number(item.reps) ?? null)'));


function htmlless(source) {
  return source.includes('data-exercise-open') && source.includes('data-exercise-edit') &&
    css.includes('.exercise-name-row.is-locked input{position:absolute');
}
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-prescription", async () => {
/**
 * 38 号 §7 的六条验收：不再只做字符串匹配，而是把 generateWeekPlan 抽到 vm 沙箱里
 * 用真实入参跑一遍，对输出断言。依赖用桩代替（plannedWeightFor / planWhy），
 * 因为它们各自的正确性由别的测试负责，这里只验「生成器怎么用它们」。
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const libText = fs.readFileSync('app/src/main/assets/training-principles.js', 'utf8');
const number = v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

const slice = (from, to) => {
  const i = app.indexOf(from);
  if (i < 0) throw new Error('missing ' + from);
  const j = to ? app.indexOf(to, i) : -1;
  return j > i ? app.slice(i, j) : app.slice(i);
};

// generateWeekPlan 本体：从函数签名到下一个顶格两空格的右括号
function bodyOf(signature) {
  const start = app.indexOf(signature);
  if (start < 0) throw new Error('missing ' + signature);
  const end = app.indexOf('\n  }\n', start);
  return app.slice(start, end + 5);
}

const sandbox = {
  number,
  console,
  window: {},
  state: {habits: [
    {date: '2026-11-21', template: 'push', exercises: [{name: '杠铃卧推', sets: 4, reps: 8, weight: 60}]},
    {date: '2026-11-19', template: 'pull', exercises: [{name: '杠铃划船', sets: 4, reps: 8, weight: 50}]}
  ]},
  activeDate: '2026-11-23',
  validDate: value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')),
  plannedWeightFor: name => /(杠铃|哑铃|器械|绳索)/.test(name) ? {weight: 20, source: 'inferred'} : {weight: null, source: 'none'},
  planWhy: () => [],
};
vm.createContext(sandbox);
vm.runInContext(libText + '\n;globalThis.__lib = window.TRAINING_PRINCIPLES;', sandbox);

const domain = readDomain();
const prelude = [
  slice('const TARGET_RULES = {', '\n  const GOAL_LABEL'),
  constLine(domain, 'BODYWEIGHT_MOVES'),
  constLine(domain, 'USER_BODYWEIGHT'),
  functionSource(domain, 'readBodyweightMarks'),
  functionSource(domain, 'isBodyweightMove'),
  functionSource(domain, 'loadableWeightKg'),
  functionSource(domain, 'trainingLibrary'),
  functionSource(domain, 'libraryRule'),
  functionSource(domain, 'libraryDayTemplate'),
  functionSource(domain, 'libraryMoves'),
  functionSource(domain, 'generateWeekPlan'),
  constSource(domain, 'BODY_PART_RULES'),
  functionSource(domain, 'exerciseBodyPart'),
  bodyOf('function nextStartTemplate(split) {'),
  ';globalThis.__gen = generateWeekPlan; globalThis.__next = nextStartTemplate; globalThis.__presets = GOAL_PRESETS;'
].join('\n');
vm.runInContext(prelude, sandbox);

const gen = sandbox.__gen;
const nextStart = sandbox.__next;
const presets = sandbox.__presets;
check('the generator is callable in a sandbox', typeof gen === 'function' && typeof presets === 'object');

const lastByExercise = {
  '杠铃卧推': {sets: 4, reps: 8, weight: 60},
  '杠铃划船': {sets: 4, reps: 8, weight: 50},
  '深蹲': {sets: 4, reps: 6, weight: 80},
  '引体向上': {sets: 4, reps: 8, weight: null}
};
const base = {startDate: '2026-11-23', sessions: 4, goal: 'gain', acwrFlag: 'ok', lastByExercise};
const run = extra => gen({...base, ...extra});

// --- §7-1 结构：每套模板都有主复合 + 次复合 + 孤立（或核心），且器械偏好生效 -------------------
// ppl 的每一天只有一个大部位，所以只允许 1 个主复合；上下肢日由「推 1 + 拉 1」组成，主复合数是 2。
for (const [split, template, mains] of [['ppl', 'push', 1], ['ul', 'upper', 2], ['fb', 'full', 1]]) {
  const plan = run({split, gear: 'mixed', minutes: 45});
  const day = plan.days.find(row => row.template === template);
  const roles = day ? day.exercises.map(item => item.role) : [];
  check(`§7-1 ${split}/${template} 有 ${mains} 个主复合`, roles.filter(role => role === 'main').length === mains, JSON.stringify(roles));
  check(`§7-1 ${split}/${template} 至少 3 个动作`, day && day.exercises.length >= 3, day && String(day.exercises.length));
  check(`§7-1 ${split}/${template} 至少 1 个次复合`, roles.filter(role => role === 'compound').length >= 1, JSON.stringify(roles));
}
// 推拉腿的单部位日必须带孤立动作；上下肢/全身可能被周组数削到只剩主+次复合（允许）。
for (const template of ['push', 'pull', 'legs']) {
  const day = run({split: 'ppl', gear: 'mixed', minutes: 45}).days.find(row => row.template === template);
  check(`§7-1 ppl/${template} 带孤立动作`, day && day.exercises.some(item => item.role === 'isolate'), day && JSON.stringify(day.exercises.map(item => item.role)));
}
const barbell = run({split: 'ppl', gear: 'barbell', minutes: 45});
const pushDay = barbell.days.find(row => row.template === 'push');
check('§7-1 器械偏好为杠铃时主复合是杠铃动作', pushDay && pushDay.exercises[0].gear === 'barbell', pushDay && pushDay.exercises[0].name);

// --- §7-2 重量：非自重必须有数（真实或推算），自重必须留空 --------------------------------------
const mixed = run({split: 'ppl', gear: 'mixed', minutes: 45});
const allExercises = mixed.days.flatMap(day => day.exercises);
const bodyweightMoves = allExercises.filter(item => item.bodyweight);
const weighted = allExercises.filter(item => !item.bodyweight);
check('§7-2 非自重动作都带重量', weighted.length > 0 && weighted.every(item => Number(item.weight) > 0), JSON.stringify(weighted.map(item => item.name + ':' + item.weight)));
check('§7-2 自重动作重量留空', bodyweightMoves.every(item => item.weight === null), String(bodyweightMoves.length));
const approxMoves = allExercises.filter(item => item.weightApprox);
check('§7-2 推算出来的重量带 weightApprox 标记', approxMoves.every(item => item.weightApprox === true && Number(item.weight) > 0), String(approxMoves.length));

// --- §7-3 总组数不超过时长预算 ---------------------------------------------------------------
for (const minutes of [30, 45, 60, 75]) {
  const plan = run({minutes});
  const budget = Math.round(minutes / 3.5);
  const overs = plan.days.filter(day => day.exercises.reduce((sum, item) => sum + item.sets, 0) > Math.max(budget, 8));
  check(`§7-3 ${minutes} 分钟的单次总组数不超 ${budget}`, overs.length === 0,
    plan.days.map(day => day.exercises.reduce((sum, item) => sum + item.sets, 0)).join('/'));
}

// --- §7-4 周组数落进目标区间（不超上限） -----------------------------------------------------
const familyOf = name => /(深蹲|硬拉|腿举|提踵|臀|保加利亚|分腿蹲)/.test(name) ? 'legs'
  : /(引体|划船|下拉|弯举|面拉|直臂)/.test(name) ? 'pull'
    : /(卧推|肩推|侧平举|下压|臂屈伸|飞鸟)/.test(name) ? 'push' : 'other';
const weekly = {push: 0, pull: 0, legs: 0};
for (const day of mixed.days) for (const item of day.exercises) weekly[familyOf(item.name)] += item.sets;
const cap = presets.gain.muscleSetsPerWeek[1];
check('§7-4 每个部位的周组数不超目标上限', weekly.push <= cap && weekly.pull <= cap && weekly.legs <= cap,
  JSON.stringify(weekly) + ' cap=' + cap);

// --- §7-5 起始部位接上一次训练的下一个 -------------------------------------------------------
check('§7-5 上次是推 → 这次先拉', nextStart('ppl') === 'pull', nextStart('ppl'));
sandbox.state.habits = [{date: '2026-11-22', template: 'legs', exercises: [{name: '深蹲', sets: 3}]}];
check('§7-5 上次是腿 → 这次先推', nextStart('ppl') === 'push', nextStart('ppl'));
check('§7-5 上下肢：上次是腿 → 先上肢', nextStart('ul') === 'upper', nextStart('ul'));
check('§7-5 全身固定 full', nextStart('fb') === 'full', nextStart('fb'));

// --- §7-6 次数与 RIR 必须落在 GOAL_PRESETS 的区间 -------------------------------------------
for (const goal of ['gain', 'cut', 'maintain', 'lean']) {
  const plan = run({goal});
  const range = presets[goal].reps;
  const rir = presets[goal].rir;
  const rows = plan.days.flatMap(day => day.exercises);
  const repsOk = rows.every(item => item.reps >= range[0] && item.reps <= range[1] + 2);
  const rirOk = rows.every(item => item.rir >= rir[0] && item.rir <= rir[1]);
  check(`§7-6 ${goal} 的次数落在 ${range[0]}~${range[1]}（自重可 +1）`, repsOk, [...new Set(rows.map(item => item.reps))].join(','));
  check(`§7-6 ${goal} 的 RIR 落在 ${rir[0]}~${rir[1]}`, rirOk, [...new Set(rows.map(item => item.rir))].join(','));
}

// --- 2026-11-23：训练要求（改偏好里的那句话）会改默认生成 --------------------------------
const reqMinutes = run({split: 'ppl', request: '只有 30 分钟'});
check('要求里的时长会覆盖分钟数（30 分钟 → 每天 ≤3 个动作）',
  reqMinutes.days.every(day => day.exercises.length <= 3), reqMinutes.days.map(day => day.exercises.length).join(','));
const reqNoSquat = run({split: 'ppl', request: '只有 45 分钟，别安排深蹲'});
const reqNames = reqNoSquat.days.flatMap(day => day.exercises.map(item => item.name));
check('要求里说「别安排深蹲」时，整周不排深蹲', reqNames.length > 0 && !reqNames.some(name => /深蹲/.test(name)), reqNames.join(','));
check('排除项不会把一天排空', reqNoSquat.days.every(day => day.exercises.length >= 1), reqNoSquat.days.map(day => day.exercises.length).join(','));
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-presets", async () => {
/**
 * 训练预设动作断言：按部位给常见动作、点一下加一行、沿用上次数据。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
const onboarding = read('app/src/fragments/68-training-log.fragment.js') + read('app/src/fragments/50-onboarding.fragment.js');
const rest = read('app/src/fragments/68-training-log.fragment.js') + read('app/src/fragments/70-rest.fragment.js');

// --- presets per body part ---------------------------------------------------------------------------
check('presets are declared once', (app.match(/const EXERCISE_PRESETS/g) || []).length === 1);
for (const [key, label] of [['push', '推'], ['pull', '拉'], ['legs', '腿'], ['other', '其他']]) {
  check(`${label}: has presets`, new RegExp(`\\b${key}: \\[`).test(app));
}
check('legs carry the most options', /legs: \['深蹲'[\s\S]{0,220}平板支撑'\]/.test(app));
check('push includes a bench press', app.includes("push: ['卧推'"));
check('pull includes pull-ups', app.includes("'引体向上'"));

// --- UI -----------------------------------------------------------------------------------------------
check('a chips container exists', html.includes('id="training-presets"'));
check('chips are rendered from the template', app.includes('function renderTrainingPresets()') && app.includes('box.dataset.template = template;'));
check('they render with the log', /renderTrainingPresets\(\);\s*const tag = \$\('#training-tag'\)/.test(app));
check('switching template re-renders them', rest.includes("$('#training-template')?.addEventListener('change', () => renderTrainingPresets());"));

// --- one tap adds a row, reusing the last values --------------------------------------------------------
check('a chip click adds a row', rest.includes("$('#training-presets')?.addEventListener('click', event => {"));
check('the name comes from the chip', rest.includes('const name = chip.dataset.trainingPreset;'));
check('last values are looked up', app.includes('function latestExerciseValues(name)'));
check('lookup scans newest habits first', app.includes("sort((a, b) => String(b.date).localeCompare(String(a.date)))"));
check('incomplete history is skipped', app.includes('if (sets === null || reps === null || weight === null) continue;'));
check('the row is prefilled', app.includes('function appendExerciseRow(name, values)') && app.includes('trainingSetDetails(item).map(setRowHtml)'));
check('the user is told what was reused', rest.includes('沿用 ${previous.date} 的'));
check('the 12-row cap still applies', app.includes("if (index >= 12) {notice('一次最多记录 12 个动作。', true); return null;}"));

// --- no duplicate declarations after the fix ----------------------------------------------------------
check('the preset block is not duplicated', (onboarding.match(/const EXERCISE_PRESETS/g) || []).length === 1);
check('there is one training log renderer', (onboarding.match(/function renderTrainingLog\(/g) || []).length === 1);
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-save-dialog", async () => {
/**
 * 结束训练弹窗 + 今天页单卡 + 休息内联（2026-11-22, 1.5.16）。
 * 约定：弹窗只拼本地数字；耗时来自本机起点；聊天与训练都不因弹窗多一次网络往返。
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

// --- 今天页：体检并进能量卡 ---------------------------------------------------------------
check('the check lives inside the energy card', html.indexOf('id="energy-check"') > html.indexOf('class="card energy-card"') &&
  html.indexOf('id="energy-check"') < html.indexOf('id="today-habits-card"'));
check('the standalone check card is gone', !html.includes('id="daily-check-card"'));
check('renderers keep their mount points', html.includes('id="daily-check"') && html.includes('id="daily-check-tag"'));
check('the merged section is separated by a hairline', css.includes('.energy-check{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}'));

// --- 训练页顺序与折叠 -------------------------------------------------------------------
check('the week overview sits above the training card', html.indexOf('id="training-overview"') < html.indexOf('id="training-log"'));
check('the overview opens by default', html.includes('<details class="train-overview" id="training-overview" open>'));
check('the plan list is gone; the toolbar and the one primary remain', !html.includes('id="ai-plan-fold"') && !html.includes('id="ai-plan-list"') &&
  html.includes('id="training-toolbar"') && html.includes('id="ai-plan-ask"') &&
  /<div class="log-actions"><button class="button primary" type="submit">保存训练<\/button><\/div>/.test(html));
check('the toolbar carries AI re-order and add-exercise; postpone/clear sit on the actions row', html.includes('id="ai-plan-ask"') && html.includes('id="training-add"') && !html.includes('id="training-more"') &&
  html.includes('id="ai-plan-postpone"') && html.includes('id="training-clear"') && !html.includes('id="training-more-sheet"') && html.includes('class="log-tools"'));

// --- 休息倒计时内联 ---------------------------------------------------------------------
check('the rest strip carries its own countdown', app.includes('data-rest-inline') && app.includes('rest-line-bar'));
check('the same paint routine drives both surfaces', /function paintRest\(left\)[\s\S]{0,2200}data-rest-inline[\s\S]{0,200}休息/.test(app));
check('clicking the inline countdown cancels the timer', /data-rest-inline[\s\S]{0,400}startRestTimer\(false, restLength\)/.test(app));
check('the floating pill yields while the strip is visible', app.includes('function restLineVisible') && /restTick \? !inline/.test(app));

// --- 结束训练弹窗 -----------------------------------------------------------------------
check('askConfirm can render extra content', app.includes('options.bodyHtml') && html.includes('id="app-dialog-body"'));
check('the dialog body starts hidden', /id="app-dialog-body" hidden/.test(html));
check('the dialog shows the session totals', app.includes('function trainingSaveDialogHtml') &&
  app.includes("parts.push('容量 '") && app.includes('个动作') && app.includes('有氧 '));
check('the dialog asks for real duration and effort', app.includes('sessionMinutesEstimate') &&
  app.includes('name="durationMin"') && app.includes('今天练下来感觉如何？'));
check('the dialog offers a fill-in-later exit', app.includes('data-dialog-fill'));
check('saving one screen writes duration with the log', /async function saveTrainingLog[\s\S]{0,7000}durationMin: Math\.round/.test(app));
check('effort is submitted in the same confirmation', /async function saveTrainingLog[\s\S]{0,7000}saveTrainingEffort\(chosenEffort\)/.test(app));
check('the session start is recorded and cleared', app.includes('markSessionStart()') &&
  app.includes('clearSessionStart()') && app.includes("'qingheng.sessionStart.'"));
;return typeof fail === 'number' ? fail : 0;
});

await __run("training-state", async () => {
/**
 * Training-day semantics after 1.4.71: trained > explicit rest > disabled/planned > unrecorded.
 * These tests execute the pure function from the assembled bundle instead of grepping source text.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing function ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '';
  for (let i = open; i < source.length; i++) {
    const ch = source[i], prev = source[i - 1];
    if (quote) {
      if (ch === quote && prev !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated function ' + name);
}

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const source = extractFunction(app, 'trainingStateFor');
const trainingStateFor = new Function(source + '\nreturn trainingStateFor;')();

const states = [
  ['trained wins over a stale rest marker', trainingStateFor({
    exercises: [{name: '卧推'}], habitTraining: false, profileTraining: 'none'
  }), 'trained'],
  ['a no-training profile with no exercise is disabled', trainingStateFor({
    profileTraining: 'none', habitTraining: undefined
  }), 'disabled'],
  ['an explicit false marker is a rest day', trainingStateFor({
    habitTraining: false, profileTraining: '3'
  }), 'rest'],
  ['the string false marker is also a rest day', trainingStateFor({
    habitTraining: 'false', profileTraining: '3'
  }), 'rest'],
  ['no marker is unrecorded, not rest', trainingStateFor({
    habitTraining: undefined, profileTraining: '3'
  }), 'unrecorded'],
  ['a cached plan with exercises is planned', trainingStateFor({
    hasPlan: true, planDay: {exercises: [{name: '深蹲'}]}
  }), 'planned'],
  ['a cached plan without exercises is a planned rest day', trainingStateFor({
    hasPlan: true, planDay: null
  }), 'plan-rest']
];
for (const [label, actual, expected] of states) check(label, actual === expected, actual);

check('real training is never hidden as rest', trainingStateFor({
  exercises: [{name: '跑步'}], habitTraining: false
}) === 'trained');
check('a blank exercise does not count as training', trainingStateFor({
  exercises: [{name: '   '}], habitTraining: false
}) === 'rest');

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("week-schedule-merge", async () => {
/**
 * 「排进本周」只追加不覆盖（2026-11-21 用户要求）。
 * 用户原话：「新增训练计划时不覆盖原有的当天记录的健身记录信息」。
 * 契约：每天原有 exercises 整条保留；同名动作跳过；一天都没新增就不写、也不改 training 标记。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

// 2026-11-23 Phase 3：排课写入收进 60 的 renderWeekPlan 委托（scheduleWeekPlan），先读 60 再读 70。
const rest = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js', 'utf8')
  + fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

// --- 唯一的排课入口：只追加 --------------------------------------------------------------------------------
check('the schedule handler dedupes by existing names', rest.includes('const have = new Set(existing.map(row => String(row && row.name || \'\').trim()))'), 'app.js 缺少去重');
check('it skips a day when nothing was added', rest.includes('if (!additions.length) { kept++; continue; }'));
check('it keeps the existing rows and appends the additions', rest.includes('exercises: [...existing, ...additions]'));
check('the old unconditional overwrite shape is gone', !rest.includes('exercises: [...existing, ...day.exercises.map(item => ({name: item.name, sets: item.sets, reps: item.reps, weight: item.weight}))]'));
check('the confirm text promises to keep records', rest.includes('已记录的动作会保留，只补充缺的动作'));
check('the notice reports skipped days', rest.includes("' 天已排过，未改动'"));

// --- 生成物同步（app.js 由 assemble 生成，必须包含同一份逻辑） ----------------------------------------------
check('the built app.js carries the same merge', app.includes('const have = new Set(existing.map(row => String(row && row.name || \'\').trim()))')
  && app.includes('exercises: [...existing, ...additions]'), '请先跑 tools/assemble-app.ps1');
check('the built app.js no longer overwrites', !app.includes('exercises: [...existing, ...day.exercises.map(item => ({name: item.name, sets: item.sets, reps: item.reps, weight: item.weight}))]'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("week-switch", async () => {
/**
 * 「本周安排」的周条点日期（2026-11-19 用户原话）：
 * 「如点击对应日期（21）后页面不跳转（可点回19号），下方显示周六 练什么动作，
 *  今天（对应动作）的动作要点，动作要点内容根据生成的本周安排具体健身项目内容变动。」
 *
 * 契约三层：
 * ① 点周条只换「看哪天」，不动 activeDate —— 周条窗口仍从原来那天起算，页面不跳，能点回今天；
 * ② 下方详情行说清那天练什么（已记录的优先，没记录就按计划）；
 * ③ 动作要点按那天计划里实际要做的动作重算，换一版计划动作变了，要点就跟着变。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const training = read(DOMAIN_FILE) + read('app/src/fragments/60-training-copy.fragment.js');
const rest = read('app/src/fragments/68-training-log.fragment.js') + read('app/src/fragments/70-rest.fragment.js');

// ① 点日期不跳页 -------------------------------------------------------------------------------
// 固定长度的窗口：用「到 const prefs」切片会撞上文件里更早出现的同名片段，切出空串。
const handlerStart = training.indexOf('planBox.addEventListener("click"');
const handler = training.slice(handlerStart, handlerStart + 1800);
check('点周条不再切换 activeDate', !handler.includes('setActiveDate'));
check('点周条只更新选中的预览日', handler.includes('weekDetailDay = day;'));
check('周条窗口的起点不受点击影响', training.includes('const weekStartPlan = startDate;'));
check('预览日越出窗口才回到正在看的那天',
  training.includes('if (!weekDetailDay || weekDetailDay < previewStart || weekDetailDay >= previewEnd) weekDetailDay = activeDate;'));

// ② 详情行说清那天练什么 ------------------------------------------------------------------------
check('详情行按预览日渲染', handler.includes('detail.textContent = weekDetailHtml(day, lastWeekPlan);'));
check('详情行优先说已记录的动作', training.includes("return prefix + '已记录 ' + items.length + ' 个动作 · '"));

// ③ 要点按那天的动作重算，并且能就地替换 ---------------------------------------------------------
check('要点不再常驻，单个动作走 ?', !training.includes('const cueHtml = weekCueHtml(weekDetailDay, plan);') && app.includes('showExerciseGuide'));
check('要点查询仍按那天计划里的动作', training.includes('function libraryCuesFor(day)') && training.includes('function cueForExercise('));
check('要点块与宿主都已移除', !handler.includes('cueHost') && !training.includes('week-cues-host'));
check('点日期只换当天明细', handler.includes('detail.textContent = weekDetailHtml(day, lastWeekPlan);'));
check('休息日不再出要点块', !training.includes('是休息日，不排动作要点'));
check('要点标题随块一起退场', !training.includes('的动作要点\');'));

// ④ 「这周怎么排的」只说周口径，不再列按天的 AI 动作清单 ------------------------------------------
// 用户反馈：这块原来会展示当天的动作安排，切预览日期它不变，读起来像那天被改了。
// 处理成删除——AI 给每个动作的理由本来就在「今日顺序」每行下面。
check('折叠块不再列 AI 的逐动作理由', !training.includes('是用 AI 排的') && !training.includes('plan-why-ai'));
check('标题改成「这周怎么排的」', training.includes('<summary>这周怎么排的</summary>'));
check('理由不再挂在今日顺序每行', !rest.includes('ai-plan-reason'));
check('只为这块存在的 aiPlanEntries 已删', !training.includes('function aiPlanEntries'));
check('previewDay / aiEntries 残骸清零', !/previewDay|aiEntries/.test(training));

// 旧做法与死变量清干净 ---------------------------------------------------------------------------
check('没有留下 setActiveDate 切日期的旧路径', !training.includes('if (typeof setActiveDate === "function") { setActiveDate(day); return; }'));
check('没有留下 explainHtml/cueLabel/cueBody/cueDay/cueIsViewed 残骸',
  !/explainHtml|cueLabel|cueBody|cueDay|cueIsViewed/.test(training));

// 生成物同步 -----------------------------------------------------------------------------------
check('app.js 与片段同步', !app.includes('function weekCueHtml') && !app.includes('id="week-cues-host"'));
;return typeof fail === 'number' ? fail : 0;
});
await __run("training-phase1", async () => {
/**
 * Phase 1（2026-11-23 训练模块解耦，第一批）：五个已确认缺陷的回归护栏。
 * 这些断言只锁「用户能感知的契约」和两处必须一致的口径，不锁实现细节。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const appJs = read('app/src/main/assets/app.js');
const onboarding = read('app/src/fragments/68-training-log.fragment.js') + read('app/src/fragments/50-onboarding.fragment.js');
const training = read(DOMAIN_FILE) + read('app/src/fragments/60-training-copy.fragment.js');
const rest = read('app/src/fragments/68-training-log.fragment.js') + read('app/src/fragments/70-rest.fragment.js');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');

// ① 杠铃总重回填：负重框是 [data-set="weight"]，没有 name 属性 --------------------------------------
const fillStart = rest.indexOf('$("#weight-fill")');
const fillBlock = rest.slice(fillStart, fillStart + 900);
check('回填按 data-set 选负重框', fillBlock.includes(`[data-set="weight"]`));
check('不再用选不到的 input[name=weight]', !fillBlock.includes('input[name=\\"weight\\"]'));

// ② 周计划重排必须带上「训练要求」 ----------------------------------------------------------------
// 锚点要落在 renderWeekPlan 里：文件更早处 weekPlanToday 也有一处 generateWeekPlan 调用（它本来就传 request）。
const planCallStart = training.indexOf('plan = generateWeekPlan({', training.indexOf('function renderWeekPlan'));
const planCall = training.slice(planCallStart, planCallStart + 700);
check('renderWeekPlan 传了 request', planCallStart > 0 && planCall.includes('request: planPref.request'));
check('weekPlanToday 仍传 request', training.includes('request: pref.request'));

// ③ 逐组容量口径：金字塔组不能被外层汇总放大 ------------------------------------------------------
check('dailyLoads 优先逐组口径', training.includes('trainingVolumeOf([item])'));
const number = value => (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) ? Number(value) : null;
const sandbox = {number};
vm.runInNewContext(functionSource(readDomain(), 'trainingVolumeOf') + '\n;globalThis.__vol = trainingVolumeOf;', sandbox);
const pyramidal = {sets: 3, reps: 10, weight: 80, setDetails: [{reps: 10, weight: 40}, {reps: 8, weight: 60}, {reps: 5, weight: 80}]};
check('金字塔组容量按各组相加', sandbox.__vol([pyramidal]) === 1280, String(sandbox.__vol([pyramidal])));
check('旧记录仍回退 sets×reps×weight', sandbox.__vol([{sets: 3, reps: 10, weight: 80}]) === 2400);
check('Java 与前端同口径（抽出共用 helper）', main.includes('private static double exerciseVolumeKg') && (main.match(/exerciseVolumeKg\(/g) || []).length >= 4);

// ④ 草稿保住行的身份，动作名不再被截到 24 字 -------------------------------------------------------
check('行上写回 planIndex 与 fromPlan', onboarding.includes('data-plan-index="${Number(item.planIndex)}"') && onboarding.includes('data-from-plan="1"'));
check('草稿读回 id / planIndex / fromPlan', onboarding.includes('planIndex: Number(row.dataset.planIndex)') && onboarding.includes("row.dataset.fromPlan === '1'") && onboarding.includes('id: row.dataset.exerciseId'));
check('播种行的 planIndex 指向清单原下标', onboarding.includes('return pending.map(({item, index}) => ({name: item.name, planIndex: index'));
check('采纳周计划不再截到 24 字', training.includes('name: String(item.name || "").slice(0, 60)'));

// ⑤ 顺延到明天要刷新执行区 ------------------------------------------------------------------------
// 锚点取监听器本身：`const postpone` 在 renderAiPlan 里也出现过一次（那是显隐，不是点击）。
const postponeStart = rest.indexOf('postpone.addEventListener');
const postponeBlock = rest.slice(postponeStart, postponeStart + 1200);
check('顺延后重绘训练表单', postponeStart > 0 && postponeBlock.includes('renderTrainingLog()'));
check('顺延后重绘今日清单', postponeBlock.includes('renderAdviceOrder()'));

;return typeof fail === 'number' ? fail : 0;
});
console.log('\nFAIL total: ' + __fail);
process.exitCode = __fail ? 1 : 0;
