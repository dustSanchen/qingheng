/**
 * 合并后的 today 套件（由 114 个单文件回归合并而来，2026-11-23）。
 * 每个原文件仍在自己的函数作用域里跑：一个文件抛错只记一条 FAIL，不会中断同组其他文件。
 */
import fs from 'node:fs';
import vm from 'node:vm';

let __fail = 0;
async function __run(name, fn) {
  try { const n = await fn(); __fail += Number(n) || 0; }
  catch (error) { console.log('FAIL  [' + name + '] ' + (error && error.message ? error.message : error)); __fail += 1; }
}

await __run("body-quick", async () => {
/**
 * 2026-11-18 用户四条反馈的断言：
 *  1. 快速记录把「（快速记录）」写进餐名，复制一次叠一层；
 *  2. 首页「拍照」胶囊与「记一餐」重复；
 *  3. 今日体检下方两行点评（评价 + 今天优先）说的是同一件事；
 *  4. 记录·身体要能一次记下当天的体重与睡眠。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

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

// --- 1. 快速记录不再叠加后缀 -------------------------------------------------------------------------
check('one helper strips the tag, both ends', app.includes('const stripQuickTag = value => String(value ?? \'\').replace(/(?:（快速记录）|\\(快速记录\\))+$/, \'\').trim();'));
check('creating a quick record no longer appends the tag', !app.includes("`${source.name || '未命名餐食'}（快速记录）`") && app.includes('const name = $(\'#quick-record-text\').value.trim() || stripQuickTag(source.name) || \'未命名餐食\';'));
check('copying a meal cleans the source name too', app.includes("copy.name = stripQuickTag(source.name) || '未命名餐食';"));
check('the meal row prints the cleaned name', app.includes("esc(stripQuickTag(meal.name) || '未命名餐食')"));
check('the copy list and quick source list use it', app.includes('${stripQuickTag(row.name) || \'未命名\'}') && app.includes('stripQuickTag(String(meal.name || \'未命名餐食\'))'));

// --- 2. 首页不再有拍照胶囊 ---------------------------------------------------------------------------
check('the camera chip is gone from today', !app.includes("['icon-glyph-camera.svg', '拍照', 'photo']") && !app.includes("focus === 'photo'"));
check('three chips remain', app.includes("['icon-meal.svg', '记一餐', 'meal-text', 'quick-chip-primary']") && app.includes("['icon-glyph-balance.svg', '身体', 'measurement-weight', '']"));
check('the chip row is a three-column grid', css.includes('.quick-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))'));
check('adding a photo still lives on the meal card', html.includes('id="photo-add"') && html.includes('id="photo-sheet"') && html.includes('id="meal-image"'));

// --- 3. 体检只有一行点评 -----------------------------------------------------------------------------
check('the second line is gone', !app.includes('check-action') && !css.includes('.check-action'));
check('the verdict is one paragraph', app.includes('+ `<p class="check-verdict">${esc(check.verdict)}</p>`;'));
const checkSource = grab('const DAILY_CHECK_WEIGHTS', ['function relaxDayInfoFor'])
  + grab('function dailyCheck(', ['function plateauFromWeekly'])
  + 'return {dailyCheck};';
const { dailyCheck } = new Function(checkSource)();
const range = { min: 2160, max: 2314 };
const macros = { proteinMin: 142, proteinMax: 155, fatMin: 55, fatMax: 70 };
const low = dailyCheck({ meals: [{ totals: { calories: 1500, protein: 90, fat: 40 } }], habit: { sleep: 5 }, range, ...macros });
check('a low day states the gap and the step in one line', /·/.test(low.verdict) && /还差/.test(low.verdict) && /[0-9]/.test(low.verdict) && /主食|蛋白|加组/.test(low.verdict), low.verdict);
check('the merged line does not repeat the priority label', !/今天优先/.test(low.verdict));
check('a low day gets a "eat more" step', /加一份主食|下一餐先吃一份蛋白质|今天训练别加组/.test(low.verdict), low.verdict);
const high = dailyCheck({ meals: [{ totals: { calories: 2600, protein: 150, fat: 90 } }], habit: { sleep: 8 }, range, ...macros });
check('an over day gets the "less at dinner" step', high.worst && high.worst.key === 'calories' && /·/.test(high.verdict) && /晚餐只吃蛋白和蔬菜/.test(high.verdict), high.verdict);
const fine = dailyCheck({ meals: [{ totals: { calories: 2200, protein: 150, fat: 60 } }], habit: { sleep: 8 }, range, ...macros });
check('a good day keeps one calm line', /保持就好/.test(fine.verdict) && !/今天优先/.test(fine.verdict), fine.verdict);
const relaxed = dailyCheck({ meals: [{ totals: { calories: 2600, protein: 150, fat: 90 } }], habit: { sleep: 8 }, range, ...macros, relax: true });
check('the relax day still explains itself in one line', /放松日/.test(relaxed.verdict) && /不用少吃/.test(relaxed.verdict) && /照常/.test(relaxed.action), relaxed.verdict);

// --- 4. 记录·身体：今天体重（2026-11-22 由「今天两样」收窄）-----------------------------------------
check('the body panel opens with today\'s weight', html.includes('id="body-quick"') && html.includes('id="body-weight-jump"') && !html.includes('id="body-quick-form"'));
check('the weight card is a read-only jump, not a second form', html.includes('data-focus="measurement-weight"') && !/<form id="body-quick-form"/.test(html));
check('sleep lives in the habit form only', html.slice(html.indexOf('id="habit-form"')).includes('name="sleep"') && !html.slice(html.indexOf('id="body-quick"'), html.indexOf('id="body-data-card"')).includes('name="sleep"'));
check('the weight card follows the viewed day', app.includes('function renderBodyWeight()') && app.includes("$('#body-weight-jump')") && app.includes("tag.textContent = weight === null ? '待记录' : '已记录'"));
check('the jump lands on the measurement field', app.includes("revealField('measurement-weight', {focus: false, block: 'start'})"));
check('the body form saves weight with the rest', app.includes("numericForm(f, ['weight', 'waist', 'bodyFat', 'muscle', 'visceralFat', 'bmr'])"));
check('the same-day measurement row is reused', app.includes('function measurementRowFor(date)') && app.includes('measurementRowFor(f.elements.date.value)'));
check('the outlier guard still compares weight', app.includes('Math.abs(weight - prevWeight) >= 2'));
check('the body panel lists the weight card first', app.includes("headings: ['今天体重', '身体数据', '日常习惯']"));
;return typeof fail === 'number' ? fail : 0;
});

await __run("daily-three-copy", async () => {
/**
 * Step 5 checks: one submit records the day's three things, and a past meal can be copied forward
 * without inventing numbers or duplicating ids.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

// --- today's two things -----------------------------------------------------------------------------
// 2026-11-18：三样卡并入体检后，记录页「身体」面板新增「今天两样」：体重 + 睡眠一次保存。
// 2026-11-22（四模块清单之三）：收窄为「今天体重」单栏；睡眠迁进日常习惯；体重的唯一可编辑处是身体数据卡。
check('the three things merged into the single action line', !html.includes('id="daily-three"') && app.includes("id: 'protein-gap'") && html.includes('id="today-action"'));
check('today\'s weight is a single read-only card with a jump', html.includes('id="body-weight-jump"') && !html.includes('id="body-quick-form"'));
check('weight is editable in exactly one place', ((html.slice(html.indexOf('id="view-records"'), html.indexOf('id="habit-card"')).match(/name="weight"/g)) || []).length === 1);
check('the manual oil field is not duplicated outside the estimate flow', !html.includes('name="oilSpoons"'));
check('weight is asked for under the documented conditions', html.includes('空腹、同一状态'));
check('sleep moved into the habit form', html.includes('id="habit-sleep"') && html.slice(html.indexOf('id="habit-form"')).includes('name="sleep"'));
check('the habit form saves all three numbers', app.includes("numericForm(form,['steps','water','sleep'])"));
check('weight updates the same-day measurement instead of adding a row', app.includes("numericForm(f, ['weight', 'waist', 'bodyFat', 'muscle', 'visceralFat', 'bmr'])") && app.includes("measurementRowFor(f.elements.date.value)"));
check('the card follows the viewed day', app.includes("function renderBodyWeight()") && app.includes("$('#body-weight-jump')"));

// --- native validation for the habit row --------------------------------------------------------------
check('habits are validated natively', main.includes('private void requireHabitFields(JSONObject record)'));
check('the habit date must be valid', /requireHabitFields[\s\S]{0,200}validDay\(record\.optString\("date"/.test(main));
check('oil spoons are bounded', main.includes('key.equals("water") ? 20000 : 30'));
check('habit validation runs on save', main.includes('if (collection.equals("habits")) requireHabitFields(record);'));

// --- copying a meal -----------------------------------------------------------------------------------
// 1.4.47 入口预算：复制一餐卡已删，复制能力留在每行餐食的「复制」按钮上。
check('the copy card is gone, row-level copy stays', !html.includes('id="copy-meal"') && app.includes("data-copy-meal="));
check('candidates prefer yesterday', app.includes("const rank = row => (row.date === yesterday ? 0 : 1);"));
check('candidates are deduplicated by name, meal and calories', app.includes('const key = row => `${row.date}|${row.mealType || \'\'}|${row.name || \'\'}|${fmt(row.calories, 0)}`;'));
check('at most five candidates are offered', app.includes('.slice(0, 5);'));
check('the copy targets the day being viewed', app.includes('copy.date = activeDate;'));
check('the copy is labelled as such', app.includes("copy.source = 'quick-copy';") && app.includes("'quick-copy':'复制'"));
check('the copy never reuses the source id', app.includes('delete copy.id;'));
check('stale draft links are dropped', app.includes('delete copy.estimateId;') && app.includes('delete copy.draftId;'));
check('a copied meal keeps a valid clock time', app.includes("copy.mealTime = nowClock();"));
check('the user confirms before copying', app.includes("if (!await askConfirm(`把「${source.name || '这一餐'}」复制到 ${activeDate}？"));
check('the app says what to do after copying', app.includes('请核对份量'));
check('an empty list is explained instead of showing a blank box', app.includes('还没有可复制的餐食记录'));
check('the copy list is re-rendered with the records view', app.includes('    renderCopyMeals();'));

// --- styles -------------------------------------------------------------------------------------------
check('the two-field row leaves no dead style behind', !css.includes('.quick-two') && !css.includes('.quick-capsule') && css.includes('.body-weight{display:flex;flex-direction:column'));
check('copy buttons are readable', css.includes('#copy-meal-buttons .button{justify-content:flex-start'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("main-action", async () => {
/**
 * Main-action contract for the chat page: reuse the existing send bar, fix it above
 * the tab bar on phones, keep one primary button, and reserve content space.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

check('the existing chat send button is the main action', /id="chat-send"/.test(html) && /class="chat-composer"/.test(html));
check('the composer stays in the input card instead of covering history', !/#view-chat \.chat-composer\{position:fixed/.test(css) && css.includes('#view-chat .chat-composer{display:flex'));
check('focus scrolls the composer into view after the keyboard settles', app.includes('installChatFocusReveal') && app.includes("bar.scrollIntoView({block: 'nearest', behavior: 'smooth'})"));
check('photo entry points sit inside the composer', html.includes('class="chat-attach"') && html.indexOf('class="chat-attach"') < html.indexOf('id="chat-send"'));
check('record form primary stays in flow and cannot cover body fields', !css.includes('#view-records .record-panel:not([hidden]) form>.button.primary[type=submit]'));
check('there is only one chat send button', (html.match(/id="chat-send"/g) || []).length === 1);
check('no second action-bar copy is added', !/id="action-bar"/.test(html));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("p0-p1-round", async () => {
/**
 * Assertions for P0-2 / P0-3 / P1-5.
 */

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
check('the action line is only filled when there is data', app.includes('TODAY_SIGNALS.energy = parts.map(text => ({text, tone:') && html.includes('id="today-action"'));

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
;return typeof fail === 'number' ? fail : 0;
});

await __run("p1-answers-phase-collapse", async () => {
/**
 * P1-4 / P1-6 / P1-7 断言。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const adapter = read('app/src/main/assets/native-adapter.js');
const app = read('app/src/main/assets/app.js');
const targets = read('app/src/fragments/40-targets.fragment.js');

// --- P1-4 answers -----------------------------------------------------------------------------------
check('citations are persisted with the answer', main.includes('Citations are saved with the answer') && main.includes('.put("sources", sources)'));
check('only https citations survive', main.includes('if (!url.startsWith("https://") || !seen.add(url)) continue;'));
check('citations are capped', main.includes('sources.length() < 6'));
check('feedback is stored on the row', main.includes('feedback.equals("unhelpful")') && main.includes('feedback.equals("helpful")'));
check('the stream path saves citations', adapter.includes('sources:final?.webSearch?.sources||[]'));
check('the buffered path saves citations', adapter.includes('sources:reply?.sources||[]'));
check('rows render citations', app.includes('function citationBlock(row)') && app.includes('来源 ${sources.length} 条'));
check('rows offer regenerate and unhelpful from the long-press sheet', app.includes("{label: '重新生成'") && app.includes("'这条没用'") && app.includes("if (kind === 'chat' && choice === 3)"));
check('regenerate refills the question', app.includes('async function regenerateChat(id)') && app.includes("box.value = String(row.question || '')"));
check('regenerate respects the shared consent', app.includes("typeof externalConsent === 'function' && externalConsent()"));
check('unhelpful state is remembered', app.includes('localStorage.setItem(CHAT_UNHELPFUL_KEY'));

// --- P1-6 lean phase ---------------------------------------------------------------------------------
check('a phase counter exists', targets.includes('function leanPhase(goal, startedAt)'));
check('the start date is stamped once', targets.includes("goal === 'lean' && !(state.profile && state.profile.leanPhaseStartedAt)"));
check('the plan shows the week number', targets.includes('薄肌阶段第 ${weeks} 周'));
check('week eight triggers a review', targets.includes('已满 8 周') && targets.includes('weeks >= 8'));

// --- P1-7 record page --------------------------------------------------------------------------------
check('low-frequency cards collapse', app.includes('function installCardCollapse()'));
check('habit card is the only folded one left', app.includes("'#habit-form'") && !app.includes("'#food-search'") && !app.includes("'#manual-meal-form'"));
check('collapsing is idempotent', app.includes("card.dataset.collapsed === '1'"));
check('it runs at boot', app.includes('installCardCollapse(); installTrainingAdvice();'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("today-agenda", async () => {
/**
 * Today's derived agenda (1.4.71): at most one primary action and two secondary actions.
 * The builder is pure: no DOM, no clock, no writes.
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
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const factory = new Function(
  extractFunction(app, 'trainingStateFor') + '\n' +
  extractFunction(app, 'buildTodayAgenda') + '\n' +
  'return {buildTodayAgenda};'
);
const {buildTodayAgenda} = factory();
const base = {
  isToday: true,
  meals: [{date: '2026-11-21', calories: 500}],
  exercises: [],
  habitTraining: undefined,
  profileTraining: '3',
  hasPlan: false,
  planDay: null,
  missingMeals: [],
  aiPlan: [],
  mealSlot: 'lunch',
  sleepMissing: false,
  weightMissing: false
};
const build = patch => buildTodayAgenda({...base, ...patch});

let agenda = build({});
check('an unrecorded day with a meal does not invent a training task', !agenda.primary, agenda.primary && agenda.primary.kind);
check('it stays unrecorded', agenda.state === 'unrecorded', agenda.state);

agenda = build({meals: []});
check('an empty day points at the first meal', agenda.primary && agenda.primary.kind === 'meal', agenda.primary && agenda.primary.kind);
check('the meal action targets the existing meal field', agenda.primary && agenda.primary.target === 'meal-text', agenda.primary && agenda.primary.target);

agenda = build({habitTraining: false, meals: [], missingMeals: []});
check('an explicit rest day never gets a training primary', !agenda.primary || agenda.primary.kind !== 'training', agenda.primary && agenda.primary.kind);
check('an explicit rest day points at the meal when nothing is logged', agenda.primary && agenda.primary.kind === 'meal');
check('the state is rest', agenda.state === 'rest', agenda.state);

agenda = build({profileTraining: 'none', aiPlan: [{name: '卧推', done: false}], meals: [], missingMeals: []});
check('a no-training profile ignores a stale AI plan', !agenda.primary || agenda.primary.kind !== 'training', agenda.primary && agenda.primary.kind);
check('the state is disabled', agenda.state === 'disabled', agenda.state);

agenda = build({hasPlan: true, planDay: {exercises: [{name: '深蹲'}]}, missingMeals: []});
check('a cached plan with an unrecorded session gets training', agenda.primary && agenda.primary.kind === 'training', agenda.primary && agenda.primary.kind);
check('it opens the existing training form', agenda.primary && agenda.primary.target === 'training-form', agenda.primary && agenda.primary.target);
check('the state is planned', agenda.state === 'planned', agenda.state);

agenda = build({hasPlan: true, planDay: null, meals: [], missingMeals: []});
check('a planned rest day does not get a training task', !agenda.primary || agenda.primary.kind !== 'training', agenda.primary && agenda.primary.kind);
check('a planned rest day is still distinct from unrecorded', agenda.state === 'plan-rest', agenda.state);

agenda = build({aiPlan: [{name: '卧推', done: false}, {name: '划船', done: true}]});
check('an unfinished AI plan becomes the primary action', agenda.primary && agenda.primary.kind === 'training', agenda.primary && agenda.primary.kind);
check('it opens the existing plan, not a new plan card', agenda.primary && agenda.primary.target === 'ai-plan', agenda.primary && agenda.primary.target);
check('it reports how many actions remain', agenda.primary && agenda.primary.reason.includes('1'), agenda.primary && agenda.primary.reason);

agenda = build({missingMeals: [{key: 'lunch', label: '午餐'}], hasPlan: true, planDay: {exercises: [{name: '深蹲'}]}});
check('a missed meal outranks a planned training session', agenda.primary && agenda.primary.kind === 'meal', agenda.primary && agenda.primary.kind);
check('the missed meal carries its own slot', agenda.primary && agenda.primary.mealSlot === 'lunch', agenda.primary && agenda.primary.mealSlot);

agenda = build({sleepMissing: true, weightMissing: true});
check('secondary actions are capped at two', agenda.secondary.length === 2, agenda.secondary.length);
check('the primary remains unique', agenda.primary === null || typeof agenda.primary.id === 'string');
check('all agenda ids are unique', new Set([agenda.primary && agenda.primary.id, ...agenda.secondary.map(row => row.id)].filter(Boolean)).size === agenda.secondary.length + (agenda.primary ? 1 : 0));

agenda = build({isToday: false, meals: []});
check('a past day never gets a live training task', !agenda.primary || agenda.primary.kind !== 'training', agenda.primary && agenda.primary.kind);
check('a past day with no meals offers a neutral backfill', agenda.primary && agenda.primary.label === '补记一餐', agenda.primary && agenda.primary.label);

agenda = build({isToday: false, meals: [{date: '2026-11-20'}]});
check('a past day with records has no live urgency', agenda.primary === null && agenda.secondary.length === 0);

check('the old false "补训练" copy is gone from the bundle', !app.includes('补训练'));
check('the action line consumes the agenda', app.includes('todayAgendaState') && app.includes('bar.dataset.target = item.target'));
check('the daily check keeps one sleep jump, not a second action surface', app.includes('href="#records" data-focus="habit-sleep"'));
check('the sheet consumes the agenda secondaries', app.includes('agenda.secondary') && app.includes('data-brief-index'));
check('a protein gap becomes the next step instead of a third reminder', app.includes("id: 'protein-gap'") && app.includes('下一餐补蛋白') && app.includes('proteinGap'));
check('the action line names itself for screen readers', app.includes('`下一步：${item.label}') && app.includes('bar.setAttribute("aria-label"'));
check('the daily check no longer hardcodes its own sleep/weight fixes', !app.includes("if (sleepValue === null) fixes.push(chip('补睡眠'") && !app.includes("if (!weightLogged) fixes.push(chip('补体重'"));
check('the rest control is bound to the existing habit row', app.includes("#training-rest") && app.includes('next.training = false'));
check('the training log exposes a state tag', html.includes('id="training-tag"') && app.includes("restMarked ? '休息日'"));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("today-paper", async () => {
/**
 * Today's paper/ledger language: a ruled sheet, a margin line, one paper hero,
 * and a two-row next-step note with an explicit reason.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('paper skin has ruled grain and a margin rule', css.includes('[data-skin="paper"] #view-today{position:relative;background-image:repeating-linear-gradient') && css.includes('[data-skin="paper"] #view-today::before'));
check('the today header has a paper divider', css.includes('.page-heading--today{border-bottom:1px solid var(--line)'));
check('today energy is one paper hero card', css.includes('#view-today .energy-card{background:var(--surface);border:1px solid var(--line);border-radius:20px'));
check('ledger keeps its square ledger frame', css.includes('[data-skin="ledger"] #view-today .energy-card{border-radius:0'));
check('the action line is a single 48px row', css.includes('.today-action{display:flex;align-items:center;gap:8px;min-height:48px'));
check('no second action surface is left', !html.includes('id="slot-note"') && !html.includes('id="slot-hint"'));
check('the sleep jump is a single direct link to the existing body field', app.includes('data-focus="habit-sleep"') && app.includes('revealField(button.dataset.focus)'));
check('the reason moved into the sheet', !html.includes('id="slot-reason"') && app.includes('function openDayBrief()'));
check('an empty day still shows a calm line', app.includes('今天没有要补的缺口，按计划走就好'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("today-status-strip", async () => {
/**
 * 今天页「一条行动行」（2026-11-22, 四模块清单之一）。
 * 约定：首屏只有一个行动面 #today-action；左边执行下一步，右边 1/N › 打开半屏「今天的状况」；
 * 原来分居两处的 #slot-hint（下一步）与 #status-strip（状态轮播）都不再存在。
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

// --- 只留一条 ---------------------------------------------------------------------------
check('the two old surfaces are gone', !html.includes('id="status-strip"') && !html.includes('id="slot-hint"'));
check('exactly one action line exists', (html.match(/id="today-action"/g) || []).length === 1);
check('it sits after the macros and before the check', html.indexOf('id="macro-summary"') < html.indexOf('id="today-action"') &&
  html.indexOf('id="today-action"') < html.indexOf('id="energy-check"'));
check('it starts hidden', /id="today-action"[^>]*hidden/.test(html));
check('left half executes, right half opens the sheet', html.includes('id="today-action-main"') && html.includes('id="today-action-more"') &&
  app.includes('openRecordTarget(target)') && app.includes('openDayBrief'));

// --- 数据源 -------------------------------------------------------------------------------
check('the action line reads the agenda', app.includes('function todayActionItems()') && app.includes('todayAgendaState()'));
check('the check verdict and energy signals feed the sheet', app.includes('TODAY_SIGNALS.check = check.verdict') && app.includes('TODAY_SIGNALS.energy = parts.map(text => ({text, tone:'));
check('the sheet reads the same status list', app.includes('const statuses = todayStatusList()') && app.includes("${(briefCursor % statuses.length) + 1}/${statuses.length}"));
check('no auto rotation is left behind', !app.includes('statusTimer') && !app.includes('}, 6000)'));
check('tapping the strip advances the sheet carousel', app.includes("strip.addEventListener(\"click\", advance)") && app.includes('briefCursor = (briefCursor + 1) % statuses.length'));

// --- 动效 ---------------------------------------------------------------------------------
check('the swap animation lives on the action text', app.includes('$("#today-action-text")') && app.includes('text.classList.add("is-swap")'));
check('it swaps with a short fade', css.includes('.today-action-text.is-swap{animation:stripSwap 180ms'));
check('reduced motion turns it off', css.includes('.today-action-text.is-swap{animation:none}'));
check('press feedback stays at scale .98 on the chips', css.includes('#view-today .habit-cell:active,#view-today .quick-chip:active{transform:scale(.98)') ||
  css.includes('#today-quick-actions .quick-chip:active{transform:scale(.98)}'));

// --- 胶囊与 sheet -------------------------------------------------------------------------
check('the three entries are one continuous capsule group', css.includes('#view-today #today-quick-actions{grid-template-columns:repeat(3,minmax(0,1fr));gap:0') &&
  css.includes('background-image:linear-gradient(180deg,color-mix(in srgb,var(--accent) 9%') &&
  css.includes('#view-today #today-quick-actions .quick-chip+.quick-chip{border-left:1px solid'));
check('the brief sheet exists as a half sheet', html.includes('id="day-brief-sheet"') && html.includes('id="brief-strip"') && html.includes('id="brief-list"'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("weekly-review-local", async () => {
/**
 * Local weekly review (1.4.73): recent completed Monday–Sunday, honest sample sizing,
 * no AI call, no invented score, no training line for a no-training profile.
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
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const factory = new Function(
  extractFunction(app, 'completedWeekEnd') + '\n' +
  extractFunction(app, 'buildWeeklyReview') + '\n' +
  'return {completedWeekEnd, buildWeeklyReview};'
);
const {completedWeekEnd, buildWeeklyReview} = factory();

check('a Sunday is the completed week end', completedWeekEnd('2026-11-22') === '2026-11-22', completedWeekEnd('2026-11-22'));
check('a Monday points back to the previous Sunday', completedWeekEnd('2026-11-16') === '2026-11-15', completedWeekEnd('2026-11-16'));
check('a Saturday points back to the previous Sunday', completedWeekEnd('2026-11-21') === '2026-11-15', completedWeekEnd('2026-11-21'));

const day = (weight, patch = {}) => ({date: '2026-11-16', weight, hasMeal: true, calories: 2000, min: 1800, max: 2200, hasExercise: false, hasRecord: true, ...patch});
const current = [
  day(70), day(null), day(70.5), day(null), day(70),
  day(null, {hasMeal: false, calories: null, min: null, max: null}),
  day(null, {hasMeal: false, calories: null, min: null, max: null})
];
const previous = [day(71), day(71), day(70.8), day(null), day(null), day(null), day(null)];
let data = buildWeeklyReview({
  weekStart: '2026-11-16', weekEnd: '2026-11-22',
  currentDays: current, previousDays: previous, trainingEnabled: true
});
check('the completed week is enough when any record exists', data.enough === true);
check('the weight mean uses measured days only', data.weight.currentMean === 70.2, data.weight.currentMean);
check('the previous week mean is compared when both samples exist', data.weight.comparable === true && data.weight.delta === -0.7, JSON.stringify(data.weight));
check('meal days are counted, not assumed', data.mealDays === 5, data.mealDays);
check('target range days are counted separately', data.targetDays === 5 && data.targetKnownDays === 5, `${data.targetDays}/${data.targetKnownDays}`);
check('training counts actual exercise days', data.training && data.training.days === 0, data.training);

const trainingOff = buildWeeklyReview({
  weekStart: '2026-11-16', weekEnd: '2026-11-22',
  currentDays: current, previousDays: previous, trainingEnabled: false
});
check('a no-training profile has no training block', trainingOff.training === null);
check('a no-training profile never gets training advice', !/训练/.test(trainingOff.action), trainingOff.action);

const oneWeight = buildWeeklyReview({
  weekStart: '2026-11-16', weekEnd: '2026-11-22',
  currentDays: [day(70), day(null), day(null), day(null), day(null), day(null), day(null)],
  previousDays: previous, trainingEnabled: true
});
check('one weight measurement cannot claim a trend', oneWeight.weight.comparable === false && oneWeight.weight.delta === null);
check('the action asks for a repeat weighing', oneWeight.action.includes('称重'), oneWeight.action);

const empty = buildWeeklyReview({weekStart: '2026-11-16', weekEnd: '2026-11-22', currentDays: [], previousDays: [], trainingEnabled: true});
check('an empty week has no invented score', empty.enough === false && empty.weight.currentMean === null);
check('an empty week gives one honest next step', empty.action.includes('先记两天'), empty.action);

const mealOnly = buildWeeklyReview({
  weekStart: '2026-11-16', weekEnd: '2026-11-22',
  currentDays: [day(null, {hasMeal: true, hasExercise: false}), day(null, {hasMeal: true}), day(null, {hasMeal: true}), day(null, {hasMeal: false}), day(null, {hasMeal: false}), day(null, {hasMeal: false}), day(null, {hasMeal: false})],
  previousDays: [], trainingEnabled: true
});
check('meal-only data still has a useful review', mealOnly.enough === true && mealOnly.mealDays === 3);
check('the local action is not a diagnosis', !/诊断|处方|疾病|节食/.test(mealOnly.action), mealOnly.action);

check('the trends page owns the weekly card', html.includes('id="weekly-review-card"') && html.includes('id="weekly-review-body"') && html.includes('id="weekly-review-range"'));
check('the card is placed in the weight panel', app.includes("headings: ['体重变化', '上周回看', '身体成分对照', '身体记录明细']"));
check('trends renders the review every time', app.includes('renderWeeklyReview();') && app.includes('function renderWeeklyReview()'));
check('the review is local and never calls a provider', !/renderWeeklyReview[\s\S]{0,1500}api\(/.test(app));
check('the card has a bounded metric grid', css.includes('.weekly-review-grid') && css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
check('the empty state is honest', app.includes('这一周记录不足，暂时不能比较。'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("weekly-review", async () => {
/**
 * Step 4b checks: the weekly review slot is real (own trigger, own request code, own prompt) and the
 * trends page judges weight by weekly means, as the written rules require.
 */

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
check('the weekly prompt repeats the 口径 hard limits', prompts.includes('缺口不得超过 deficitCapPercent% 的维持热量'));
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
;return typeof fail === 'number' ? fail : 0;
});
console.log('\nFAIL total: ' + __fail);
process.exitCode = __fail ? 1 : 0;
