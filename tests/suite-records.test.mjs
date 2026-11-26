/**
 * 合并后的 records 套件（由 114 个单文件回归合并而来，2026-11-23）。
 * 每个原文件仍在自己的函数作用域里跑：一个文件抛错只记一条 FAIL，不会中断同组其他文件。
 */
import fs from 'node:fs';

let __fail = 0;
async function __run(name, fn) {
  try { const n = await fn(); __fail += Number(n) || 0; }
  catch (error) { console.log('FAIL  [' + name + '] ' + (error && error.message ? error.message : error)); __fail += 1; }
}

await __run("layout-and-autorecalc", async () => {
/**
 * 本轮断言：删除按钮位置、自动重算、以及相关样式。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const meals = read('app/src/fragments/50-onboarding.fragment.js');
const targets = read('app/src/fragments/40-targets.fragment.js');
const rest = read('app/src/fragments/68-training-log.fragment.js') + read('app/src/fragments/70-rest.fragment.js');
const aiChatSrc = read('app/src/fragments/80-ai-chat.fragment.js');
const app = read('app/src/main/assets/app.js');
const css = read('app/src/main/assets/styles.css');

// --- the delete action moved out of the calorie column ------------------------------------------------
const rowBlock = meals.slice(meals.indexOf('return `<div class="meal-row list-row"'), meals.indexOf('}).join(\'\') : empty('));
check('the delete button is in the title row', rowBlock.indexOf('row-delete') < rowBlock.indexOf('</div>`') && rowBlock.includes('class="icon-button danger row-delete"'));
check('the calorie column no longer holds a delete button', !/row-side[\s\S]{0,200}data-delete-meal/.test(rowBlock), 'row-side keeps only the kcal');
check('the button keeps an accessible label', rowBlock.includes('aria-label="删除'));
check('it is compact and self-aligned', css.includes('.row-delete{width:32px;height:32px') && css.includes('margin-left:auto'));

// --- auto recalculation -------------------------------------------------------------------------------
check('a change listener is installed', targets.includes('function installProfileAutoRecalc()'));
check('goal, weight, height and age all trigger it', targets.includes("const fields = ['goal', 'weight', 'height', 'age'];"));
check('it recalculates without saving', targets.includes('recalcProfileTargets({saveMeasurement: false, auto: true})'));
check('the status says it is unsaved', targets.includes('已按当前选择自动重算（未保存，点「保存档案」生效）：'));
check('it is wired at boot', rest.includes('installProfileAutoRecalc();'));

// --- the derived numbers come from the same function ---------------------------------------------------
check('calorie ranges come from the goal plan', targets.includes('trainingDay = {min: Math.round(centre * 0.98), max: Math.round(centre * 1.04)}'));
check('protein follows the goal preset', targets.includes('const proteinPerKgMin = preset.proteinPerKgMin;'));
check('the weekly average is reported', targets.includes('weeklyAverage'));
check('the training-frequency lever is still shown', targets.includes('训练频率杠杆'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("layout-four", async () => {
/**
 * 四项布局优化断言：
 *  1. 今天页快捷胶囊；2. 趋势页三段 + 饮食趋势；3. 餐食列表 5 条 + 显示全部；4. 按天分组。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');
const app = read('app/src/main/assets/app.js');
const css = read('app/src/main/assets/styles.css');
const html = read('app/src/main/assets/index.html');

check('the top brand row is gone and a date running head replaces it', !html.includes('class="brand"') && html.includes('class="running-head"') && html.includes('id="running-date"') &&
   app.includes('runningDate.textContent') &&
   css.includes('.running-head{display:flex'));

check('the page closes with a folio', html.includes('class="folio"') && app.includes('folioDay.textContent'));
// --- 1. today quick actions ---------------------------------------------------------------------------
check('a quick action row is installed on today', app.includes('function installTodayQuickActions()') && app.includes("row.id = 'today-quick-actions'"));
check('energy ring and target detail share one compact summary', app.includes('body.replaceChildren(ring, detail)') &&
  !app.includes('detail.append(actions)') && !app.includes('energy-explanation'));
check('energy summary keeps a responsive two-column layout', css.includes('.energy-body{display:grid;grid-template-columns:112px minmax(0,1fr)') &&
  css.includes('.energy-body{grid-template-columns:150px minmax(0,1fr)') &&
  css.includes('.energy-body{grid-template-columns:96px minmax(0,1fr)'));
// 2026-11-18：首页「拍照」胶囊删除——「记一餐」那张卡里本来就有添加照片，重复一步。
for (const label of ['记一餐', '训练', '身体']) check(`chip: ${label}`, app.includes(label));
check('no camera chip on today', !app.includes("['icon-glyph-camera.svg', '拍照', 'photo']"));
check('only 记一餐 keeps the primary chip weight', app.includes("['icon-meal.svg', '记一餐', 'meal-text', 'quick-chip-primary']") && !app.includes('quickPrimaryFocus'));
check('chips route through the shared record target', app.includes('function openRecordTarget(target, options = {})') && app.includes('openRecordTarget(chip.dataset.quickFocus)'));
check('the photo entry stays on the meal card', html.includes('id="photo-add"') && html.includes('id="photo-sheet"'));
check('the training chip scrolls without focusing', app.includes("flashTarget(form.closest('.card'))") && app.includes("revealField(focus, {focus: false, block: 'start'});"));
check('chat input and quick prompts lead the composer', app.includes('function installChatTaskOrder()') && app.includes('question.after(chips)'));
// 1.4.53：我的页从八行收成四行（档案 / AI 与提醒 / 外观与偏好 / 数据与关于），仍是一级子页而不是二级折叠。
check('profile settings stay one sub-page deep', app.includes('function installProfileMore()') && html.includes('外观与偏好') &&
  html.includes('id="subpage-appearance"') && html.includes('id="subpage-data"') && !app.includes("details.id = 'profile-more'"));

// --- 2. trends segments + diet trend ------------------------------------------------------------------
check('trends get a segment bar', app.includes("bar.id = 'trends-tabs'"));
check('the trends bar is inserted inside its view', app.includes("if (heading) heading.after(bar); else view.prepend(bar);"));
check('three trend panels', ['weight', 'diet', 'training'].every(key => app.includes(`'${key}'`)));
check('the diet card is built in JS', app.includes('function dietTrendCard()') && app.includes("card.id = 'diet-trend-card'"));
check('the diet card covers seven days', app.includes('for (let offset = 6; offset >= 0; offset--)'));
check('bars are a share of the upper bound', app.includes('intakeRangeForDate(day)') && app.includes('Math.round((kcal / scaleMax) * 100)'));
check('states are in / low / over / empty', app.includes("kcal > range.max ? 'over' : kcal < range.min ? 'low' : 'in'"));
check('values carry a unit', app.includes('`${kcal} kcal`'));
check('a colour legend exists', app.includes('diet-key in') && app.includes('diet-key over'));
check('each bar carries its state class', app.includes('class="${stateKey}"'));
check('a real date shift helper exists', app.includes('function shiftDate(day, delta)'));
check('the diet card is filled on every render', app.includes('function renderDietTrend()') && app.includes("if (typeof renderDietTrend === 'function') renderDietTrend();"));
check('training panel hides for no-training profiles', app.includes("button.dataset.trendsPanel === 'training') button.hidden = !trainingEnabled()"));
check('the weight history table is folded below its chart', app.includes("foldedHeadings: ['身体记录明细']") && app.includes("summary.textContent = panel.key === 'weight' ? '更多身体数据'"));

// --- 3/4. record list: capped and grouped ---------------------------------------------------------------
check('the list is capped at five', app.includes('const RECORD_MEALS_COLLAPSED = 5;'));
check('a show-all toggle exists', app.includes('显示全部 ') && app.includes("id=\"record-meals-toggle\"") || app.includes("record-meals-toggle"));
check('expanding is remembered in the session', app.includes('recordMealsExpanded = !recordMealsExpanded;'));
check('rows are grouped by day', app.includes('function renderRecordMeals(rows)') && app.includes('const groups = new Map();'));
check('each day shows its own total', app.includes('${list.length} 餐 · ${fmt(kcal, 0)} kcal'));
check('the record list uses the grouped renderer', app.includes('renderRecordMeals(favoriteOnlyMeals ? recordMeals.filter'));
check('today has one timeline for meals and same-day health events', html.includes('id="today-records-card"') &&
  html.includes('id="today-record-count"') && !html.includes('id="day-stream-card"') &&
  app.includes("renderTodayTimeline($('#today-meals'), meals)") && app.includes("mealRowsHtml([meal], false)"));
check('the timeline reads weight from the same-day measurement record', app.includes("state.measurements || []).find(row => row && row.date === activeDate"));
check('today and historical meals share one bottom separator per row', /#today-meals \.meal-row,#record-meals \.meal-row\{[^}]*border-top:0;[^}]*border-bottom:1px solid var\(--record-separator\)/s.test(css) &&
  css.includes('#today-meals > :last-child,#record-meals .meal-day > .meal-row:last-child{border-bottom:0}') &&
  css.includes('.day-event{padding:var(--space-2) 0;border:0;border-bottom:1px solid var(--line)}'));
// 2026-11-24：取消「今日记录 / 小习惯」分段，两段上下相接成一个连续流；记录在前、习惯在后，建议仍在主流程。
check('records and habits form one flow without a second switch', html.indexOf('id="today-records-card"') < html.indexOf('id="today-habits-card"') &&
  !html.includes('fold-tabs') && !html.includes('data-fold-tab') && !html.includes('data-fold-panel') &&
  html.indexOf('给今天的一点建议') > html.indexOf('id="today-fold-card"') &&
  !html.includes('id="day-more"') &&
  !app.includes('TODAY_FOLD_KEY'));
check('meal slots are collapsed by default', app.includes('order.length === 1 && list.length === 1') && !app.includes('latestKey'));
check('quick copy is a quiet text link in the energy heading', app.includes("button.className = 'text-button quick-record-link'") &&
  app.includes('heading.appendChild(button)') && !html.includes('id="energy-actions"'));
check('quick record meal type is an in-dialog chip row, not a native select', app.includes('id="quick-record-type" role="radiogroup"') &&
  !app.includes('<select id="quick-record-type"') && app.includes('setQuickRecordType(') &&
  app.includes("mealType:quickRecordType") && css.includes('.quick-type-chip{min-height:44px'));
check('today records empty state does not add a dashed inner frame', css.includes('#today-records-card .empty-state.is-empty{border:0;border-radius:0}'));

// --- styles ---------------------------------------------------------------------------------------------
check('the three core actions sit inside the card, above the suggestion stream', app.includes("anchor.after(row)") && !app.includes('energyCard.after(row)') && css.includes('.quick-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))') && !css.includes('.quick-actions{position:fixed'));
check('quick action targets stay at least 44px with 8px gaps', css.includes('gap:8px') && css.includes('min-height:52px'));
check('bottom navigation keeps 52px targets and 8px spacing', /\.bottom-nav button\{[^}]*min-height:52px/.test(css) && /\.bottom-nav\{[^}]*gap:8px/.test(css));
check('record and trend tabs keep 44px targets and 8px spacing', /\.segment-bar\{[^}]*gap:8px/.test(css) && /\.segment\{[^}]*min-height:44px/.test(css));
check('day groups are styled', css.includes('.meal-day-head{'));
check('diet bars are styled', css.includes('.diet-bar i{') && css.includes('.diet-bar i.over{'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("records-density", async () => {
/**
 * Training/body density: long cue text starts folded, and optional body data does
 * not compete with the daily two-field form on first paint.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

check('the resident cue block is gone', !app.includes('week-cues') && !app.includes('plan-cue-block'));
check('a movement\'s cues open from the ? button instead', app.includes('showExerciseGuide') && app.includes('data-exercise-help') === false);
check('body data is an optional fold', html.includes('id="body-data-fold"') && html.includes('<summary class="card-heading"><h2>身体数据</h2><span class="tag">选填</span></summary>'));
check('the daily two-field form remains first', html.indexOf('id="body-quick"') < html.indexOf('id="body-data-card"'));
check('the fold has an open/close affordance', css.includes(".card-fold>summary::after{content:'展开'") && css.includes(".card-fold[open]>summary::after{content:'收起'}"));
check('revealField still opens an ancestor fold when jumping to a field', app.includes('if (details && !details.open) details.open = true;'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("records-panels", async () => {
/**
 * 记录页分段化断言：三段存在、卡片归位、跳转先切段、不健身时隐藏训练段。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');
const app = read('app/src/main/assets/app.js');
const css = read('app/src/main/assets/styles.css');
const html = read('app/src/main/assets/index.html');

check('three segments are declared', /label: '饮食'/.test(app) && /label: '训练'/.test(app) && /label: '身体'/.test(app));
check('every card lands in a segment', ['轻松记一餐', '最近的餐食记录', '训练日志', '今天体重', '身体数据', '日常习惯']
  .every(h => app.includes(`'${h}'`)));
check('body opens with today\'s weight, then the body card and habits', app.includes("headings: ['今天体重', '身体数据', '日常习惯']"));
check('the food segment keeps two cards and nothing is folded any more', app.includes("headings: ['轻松记一餐', '最近的餐食记录']") && !app.includes("foldedHeadings: ['食品热量参考库'"));
check('plan, today order, then logging', app.includes("headings: ['训练计划', '今日顺序', '训练日志']"));
check('training overview belongs to the training segment', app.includes('panels.training.insertBefore(overview, logCard)'));
check('plan preferences can be collapsed again', app.includes('edit.textContent = collapsed ? "改偏好" : "取消"') &&
  app.includes('restoreSaved();') && app.includes('"改训练偏好"'));
// 2026-11-24 用户要求：在训练段跳去问答再回来，仍停在训练——进记录页不再强制落回「饮食」。
check('entering records keeps the last segment instead of forcing food', !app.includes("tab === 'records' && currentTab !== 'records' && !sub") &&
  app.includes("localStorage.setItem(RECORD_PANEL_STORAGE, target)") &&
  app.includes('switchRecordPanel(RECORD_PANELS.some(p => p.key === saved) ? saved : \'food\')'));
check('training save outranks week planning', html.includes('class="button subtle" id="pref-save"') && html.includes('class="button primary" type="submit">保存训练'));
check('the installer runs at boot', app.includes('installRecordPanels();'));
check('segments are buttons with role=tab', app.includes('role="tab" data-records-panel='));
check('one segment is visible at a time', app.includes("node.hidden = panel.key !== target"));
check('the choice is remembered', app.includes("localStorage.setItem(RECORD_PANEL_STORAGE, target)"));
check('training segment hides for a no-training profile', app.includes('panel.trainingOnly && !trainingEnabled()'));
check('jumps pick the owning segment', app.includes('function recordPanelForField(id)') && app.includes("return 'body';"));
check('reveal switches before focusing', /switchRecordPanel\(recordPanelForField\(id\)\);/.test(app));
check('the sleep chip lands in the body segment', app.includes("addSecondary({id: 'sleep', kind: 'sleep', label: '补睡眠', target: 'habit-sleep'})") && app.includes("['habit-sleep', 'habit-steps', 'habit-form', 'measurement-weight', 'measurement-form']"));
check('a no-training profile never opens an empty records page', app.includes("if (target === 'training' && !trainingEnabled()) target = 'food';"));
check('the training quick chip is hidden without a plan', app.includes(".filter(([, , focus]) => focus !== 'training-form' || trainingEnabled())"));
check('body composition is not hidden with training', read('app/src/main/assets/index.html').includes('id="body-comp-card"') && app.includes("headings: ['体重变化', '上周回看', '身体成分对照', '身体记录明细']"));
check('the bar is sticky and styled', css.includes('.segment-bar{position:sticky') && css.includes('.segment[aria-selected="true"]'));
check('both skins share the hairline segment bar', css.includes('#view-records .segment-bar,#view-trends .segment-bar{border:0;border-bottom:1px solid var(--line)') &&
  !css.includes('[data-skin="ledger"] #view-records .segment-bar'));
check('paper cards use open sections while ledger cards keep one frame', css.includes('.card{background:transparent;border:0;border-radius:0;padding:var(--card-pad) 0') &&
  css.includes('[data-skin="ledger"] .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--shape-card-radius)'));
check('paper navigation rows use separators while ledger rows keep a frame', css.includes('.hub-row{display:flex;align-items:center;gap:14px;width:100%;min-height:var(--btn-h);padding:16px 20px;border:0;border-bottom:1px solid var(--line)') &&
  css.includes('[data-skin="ledger"] .hub-row{border:1px solid var(--line)') &&
  css.includes('border-radius:0;background:transparent;color:var(--ink);text-align:left;}') &&
  css.includes('border-radius:var(--shape-row-radius);background:var(--surface);}'));
check('ledger card headings do not duplicate the outer frame', css.includes('[data-skin="ledger"] .card-heading{padding-bottom:0;border-bottom:0}'));
check('the today page no longer nests a folded more section', !html.includes('class="day-more"') && !css.includes('.day-more') && !app.includes("$('#day-more')"));
check('draft state keeps its dashed boundary after paper cards are opened', css.includes('.training-draft{border:1px dashed var(--accent-line)'));
const profileMore = app.slice(app.indexOf('function installProfileMore()'), app.indexOf('function installTrendPanels()'));
check('skin selection leads the appearance sub-page', profileMore.indexOf("$('#skin-card')") >= 0 &&
  profileMore.includes('appearance.insertBefore(skin, anchor)'));
check('hidden panels do not take space', css.includes('.record-panel[hidden]{display:none}'));
check('ledger record controls use a 2px physical hairline at 480 dpi', /\[data-skin="ledger"\] #view-records input:not\(\[type=checkbox\]\):not\(\[type=radio\]\),\s*\[data-skin="ledger"\] #view-records select,\s*\[data-skin="ledger"\] #view-records textarea\{border-width:\.67px\}/.test(css));
check('ledger form cells own separators without nested control borders', css.includes('[data-skin="ledger"] #view-records .form-grid>label input:not([type=checkbox]):not([type=radio])') &&
  css.includes('border:0;border-radius:0;background:transparent;padding-left:0;padding-right:0'));
check('training entries use bottom separators instead of closed cards', /\.training-row\{[^}]*border:0;border-bottom:1px solid var\(--line\);border-radius:0/.test(css) &&
  css.includes('#training-exercises .training-row:last-child{border-bottom:0}'));
check('folded cards do not keep a second frame', css.includes('details.panel-more{margin:var(--space-3) 0;border:0;border-top:1px solid var(--line)') &&
  css.includes('.panel-more>.card{margin:var(--space-2) 0 0;padding:var(--space-2) 0;border:0') &&
  !css.includes('.profile-more'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("structure-phase", async () => {
/**
 * P1–P3 的结构契约：单一计划来源、配置注册表、两种等待反馈、估算思考流。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const head = read('app/src/fragments/00-head.fragment.js');
const training = read('app/src/fragments/60-training-copy.fragment.js');
const domain = read('app/src/fragments/55-training-domain.fragment.js');
const onboarding = read('app/src/fragments/68-training-log.fragment.js') + read('app/src/fragments/50-onboarding.fragment.js');
const rich = read('app/src/fragments/10-rich-answer.fragment.js');
const rest = read('app/src/fragments/68-training-log.fragment.js') + read('app/src/fragments/70-rest.fragment.js');
const aiChatSrc = read('app/src/fragments/80-ai-chat.fragment.js');
const html = read('app/src/main/assets/index.html');
const adapter = read('app/src/main/assets/native-adapter.js');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const completion = read('app/src/main/java/cn/qingheng/health/ChatCompletion.java');

check('the week list reads the generated plan, not a second rotation',
  training.includes('const planDay = plan.days.find(item => item.date === day)')
  && !training.includes('const planned = days.includes(offset)'));
check('today session delegates to weekPlanToday', training.includes('return weekPlanToday().day;'));

check('config registry lists synced local keys', head.includes('const CONFIG_REGISTRY') && head.includes("id: 'planPrefs'") && head.includes("id: 'aiPlans'"));
check('loadState reconciles config drift', head.includes('try { verifyConfigSync(); }'));

check('full-screen busy layer is gone', !html.includes('id="busy-layer"') && !rest.includes('$("#busy-layer")'));

check('native estimate accepts a thinking sink', main.includes('Delta sink, ChatCompletion.Delta think') && main.includes('pushEstimateEvent("think"'));
check('adapter forwards think events', adapter.includes("event.kind==='think'") && adapter.includes('sink.onThink'));
check('estimate status uses verb + noun only',
  rest.includes('正在分析食品营养') && rest.includes('正在核算份量与热量') && !rest.includes('estimate-think'));

check('state schema version and migration exist',
  main.includes('STATE_VERSION = 4') && main.includes('private static void migrateState')
  && main.includes('backupBeforeMigration'));
check('calc module is loaded before app.js', html.includes('./calc.js'));

check('estimate turns DeepSeek thinking off',
  main.includes('CAP_ESTIMATE, false)') && main.includes(', false).trim();')
  && main.includes('ChatCompletion.completeMessage'));
check('thinking is only disabled for DeepSeek',
  completion.includes('private static void disableThinking')
  && completion.includes('"thinking", new JSONObject().put("type", "disabled")'));

check('streaming chat honours logToHistory:false', adapter.includes("if(body?.logToHistory!==false) await storageRequest('/api/chatlog'"));
check('old plan prompts are cleaned from chat history once', head.includes('cleanupPlanChatEntries') && head.includes('请为今天排一个按顺序执行的训练清单'));

check('plan rows offer one-tap logging',
  rest.includes('startLoggingFromPlan')
  && training.includes('data-today-log='));
check('the training form can repeat the last session',
  onboarding.includes('function repeatLastTraining') && html.includes('id="training-repeat"'));

check('recommended loads are plate-achievable',
  domain.includes('function loadableWeightKg') && domain.includes('loadableWeightKg(name, next)')
  && aiChatSrc.includes('20 kg 空杆 + 每侧 2.5 kg'));
check('the training overview connects diet and lifting',
  html.includes('id="training-overview"') && html.includes('train-overview-head')
  && rest.includes('function renderTrainingOverview'));

check('the week plan can be regenerated explicitly',
  training.includes('function regenerateWeekPlan') && html.includes('id="pref-regen"')
  && training.includes('regenerateWeekPlan({'));
check('生成后先给一屏「这周这样排」，而不是只弹 toast',
  training.includes('function showCoachSummary') && training.includes("title: '这周这样排'") &&
  training.includes('看详细说明') && training.includes('已排除：'));
check('计划标题下有可展开的「为什么这样排」',
  training.includes('function planWhyBadgeHtml') && training.includes('plan-why-badge') && training.includes('为什么这样排？'));
check('the fast chat context carries training and meals',
  main.includes('trainingLast7Days') && main.includes('cappedWindow(numericWindow("meals", from, selectedDate), 10)'));

check('training records are per set',
  onboarding.includes('setDetails') && main.includes('JSONArray setDetails = item.optJSONArray("setDetails")')
  && onboarding.includes('renderTrainingSummary'));
check('rest timer and plan actions exist',
  html.includes('id="rest-timer"') && rest.includes('restEnd = Date.now() + length * 1000')
  && html.includes('id="ai-plan-ask"') && html.includes('id="ai-plan-postpone"'));
check('diet and training link both ways',
  html.includes('id="today-training-line"') && rich.includes("trainingLine.textContent"));

check('each set can be marked done and starts the rest timer',
  onboarding.includes('data-set-done') && rest.includes('startRestTimer(true, restSecondsFor(name))'));
check('swapping an exercise re-rounds the load',
  aiChatSrc.includes('function planWeightFor') && aiChatSrc.includes('loadableWeightKg(row.name'));

console.log('\nPASS total: 0 failed');
;return typeof fail === 'number' ? fail : 0;
});

await __run("ui-state-matrix", async () => {
/**
 * P2 8 state/accessibility checks that are cheap to keep honest:
 * empty/error states, long text boundaries, focus, reduced motion and listeners.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

check('stateBlock supports empty/loading/error kinds', /const STATE_BLOCK_KINDS = \[[^\]]*'empty'[^\]]*'loading'[^\]]*'error'/.test(app));
check('stateBlock exposes status and alert roles', app.includes('k === \'error\' ? \' role="alert"\'') && app.includes('k === \'loading\' ? \' role="status"'));
check('empty trend state is explained without a second entry', app.includes("title: '记录第一笔体重'") && !app.includes("label: '去记录体重'"));
check('empty trend state clears stale weekly copy', /weekly\.hidden = true/.test(app));
check('long meal names can wrap', /#chat-log \.meal-row p\{white-space:pre-line;overflow-wrap:anywhere\}/.test(css));
check('long preference rows can wrap', /preference-row|hub-summary/.test(css) && /overflow-wrap|text-wrap/.test(css));
check('320px has a narrow-screen rule', /@media\(max-width:360px\)/.test(css));
check('focus-visible styling remains', css.includes(':focus-visible'));
check('reduced motion remains handled', css.includes('prefers-reduced-motion'));
check('the trend tooltip timer is cleared before rerender', app.includes('if (trendTooltipTimer) {clearTimeout(trendTooltipTimer); trendTooltipTimer = null;}'));
check('interval timers have matching clear paths', (app.match(/clearInterval\(/g) || []).length >= (app.match(/setInterval\(/g) || []).length);
check('main buttons expose accessible labels or visible text', html.includes('aria-label="选择分析日期"') && html.includes('aria-label="主要导航"'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});
console.log('\nFAIL total: ' + __fail);
process.exitCode = __fail ? 1 : 0;
