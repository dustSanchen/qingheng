/**
 * 四项布局优化断言：
 *  1. 今天页快捷胶囊；2. 趋势页三段 + 饮食趋势；3. 餐食列表 5 条 + 显示全部；4. 按天分组。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');
const app = read('app/src/main/assets/app.js');
const css = read('app/src/main/assets/styles.css');
const html = read('app/src/main/assets/index.html');

check('all tabs share one compact brand header', html.includes('<img src="./icon.svg" alt="" width="28" height="28">') &&
  css.includes('.app-header{padding:14px 0 12px;margin-bottom:4px;border-bottom:1px solid var(--line)}') &&
  css.includes('.brand small{display:none}') && css.includes('.brand img{width:28px;height:28px}') &&
  css.includes('.brand>span{font-size:var(--text-lg)}') &&
  !css.includes('html[data-tab]:not([data-tab="today"]) .app-header'));

// --- 1. today quick actions ---------------------------------------------------------------------------
check('a quick action row is installed on today', app.includes('function installTodayQuickActions()') && app.includes("row.id = 'today-quick-actions'"));
check('energy ring and target detail share one compact summary', app.includes('body.replaceChildren(ring, detail)') &&
  !app.includes('detail.append(actions)') && !app.includes('energy-explanation'));
check('energy summary keeps a responsive two-column layout', css.includes('.energy-body{display:grid;grid-template-columns:112px minmax(0,1fr)') &&
  css.includes('.energy-body{grid-template-columns:150px minmax(0,1fr)') &&
  css.includes('.energy-body{grid-template-columns:96px minmax(0,1fr)'));
for (const label of ['记一餐', '训练', '身体', '拍照']) check(`chip: ${label}`, app.includes(label));
check('only the meal action is visually primary', app.includes("'quick-chip-primary'") && css.includes('.quick-chip.quick-chip-primary{background:var(--accent)'));
check('chips route to the right segment', app.includes('switchRecordPanel(recordPanelForField(focus === \'photo\' ? \'meal-text\' : focus))'));
check('the photo chip opens the camera tile', app.includes("$('#view-records label[for=\"meal-image\"]')?.click();"));
check('the training chip scrolls without focusing', app.includes("flashTarget(form.closest('.card'))") && app.includes("revealField(focus, {focus: false, block: 'start'});"));
check('chat input and quick prompts lead the composer', app.includes('function installChatTaskOrder()') && app.includes('question.after(chips)'));
check('low-frequency profile settings are folded', app.includes('function installProfileMore()') && app.includes('数据、外观与说明') && app.includes("iconMarkup('icon-copy.svg')"));

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
check('quick copy is a header action rather than a second full-width button', app.includes("button.className = 'text-button quick-record-action'") &&
  app.includes('heading.appendChild(button)') && !html.includes('id="energy-actions"'));
check('today records empty state does not add a dashed inner frame', css.includes('#today-records-card .empty-state.is-empty{border:0;border-radius:0}'));

// --- styles ---------------------------------------------------------------------------------------------
check('quick actions follow the energy summary without overlaying content', app.includes('energyBody.after(row)') && css.includes('.quick-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))') && !css.includes('.quick-actions{position:fixed'));
check('quick action targets stay at least 44px with 8px gaps', css.includes('gap:8px') && css.includes('min-height:52px'));
check('bottom navigation keeps 52px targets and 8px spacing', /\.bottom-nav button\{[^}]*min-height:52px/.test(css) && /\.bottom-nav\{[^}]*gap:8px/.test(css));
check('record and trend tabs keep 44px targets and 8px spacing', /\.segment-bar\{[^}]*gap:8px/.test(css) && /\.segment\{[^}]*min-height:44px/.test(css));
check('day groups are styled', css.includes('.meal-day-head{'));
check('diet bars are styled', css.includes('.diet-bar i{') && css.includes('.diet-bar i.over{'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
