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

// --- 1. today quick actions ---------------------------------------------------------------------------
check('a quick action row is installed on today', app.includes('function installTodayQuickActions()') && app.includes("row.id = 'today-quick-actions'"));
for (const label of ['记一餐', '记训练', '记体重', '拍照']) check(`chip: ${label}`, app.includes(label));
check('chips route to the right segment', app.includes('switchRecordPanel(recordPanelForField(focus === \'photo\' ? \'meal-text\' : focus))'));
check('the photo chip opens the camera tile', app.includes("$('#view-records label[for=\"meal-image\"]')?.click();"));
check('the training chip scrolls without focusing', app.includes("flashTarget(form.closest('.card'))") && app.includes("revealField(focus, {focus: false, block: 'start'});"));

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

// --- 3/4. record list: capped and grouped ---------------------------------------------------------------
check('the list is capped at five', app.includes('const RECORD_MEALS_COLLAPSED = 5;'));
check('a show-all toggle exists', app.includes('显示全部 ') && app.includes("id=\"record-meals-toggle\"") || app.includes("record-meals-toggle"));
check('expanding is remembered in the session', app.includes('recordMealsExpanded = !recordMealsExpanded;'));
check('rows are grouped by day', app.includes('function renderRecordMeals(rows)') && app.includes('const groups = new Map();'));
check('each day shows its own total', app.includes('${list.length} 餐 · ${fmt(kcal, 0)} kcal'));
check('the record list uses the grouped renderer', app.includes('renderRecordMeals(favoriteOnlyMeals ? recordMeals.filter'));
check('the today list keeps the flat renderer', app.includes("renderMeals($('#today-meals'),meals,false);"));

// --- styles ---------------------------------------------------------------------------------------------
check('quick chips are a four-column grid', css.includes('.quick-actions{display:grid;grid-template-columns:repeat(4,1fr)'));
check('day groups are styled', css.includes('.meal-day-head{'));
check('diet bars are styled', css.includes('.diet-bar i{') && css.includes('.diet-bar i.over{'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
