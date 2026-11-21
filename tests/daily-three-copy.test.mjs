/**
 * Step 5 checks: one submit records the day's three things, and a past meal can be copied forward
 * without inventing numbers or duplicating ids.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

// --- today's two things -----------------------------------------------------------------------------
// 2026-11-18：三样卡并入体检后，记录页「身体」面板新增「今天两样」：体重 + 睡眠一次保存。
check('the three things merged into the single next step', !html.includes('id="daily-three"') && app.includes("id: 'protein-gap'") && app.includes('is-next'));
check('the body panel asks for weight and sleep in one row', html.includes('id="body-quick-form"') && html.includes('name="weight"') && html.includes('name="sleep"'));
check('the manual oil field is not duplicated outside the estimate flow', !html.includes('name="oilSpoons"'));
check('weight is asked for under the documented conditions', html.includes('空腹、同一状态'));
check('the card is prefilled from the day being viewed', app.includes("const habit = (state.habits || []).find(row => row && row.date === activeDate) || {};") && app.includes("const measurement = (state.measurements || []).find(row => row && row.date === activeDate) || {};"));
check('a two-part tag shows progress', app.includes("filled === 2 ? '已记录两样' : `已记录 ${filled}/2`"));
check('an empty submit is refused', /if \(weight === null && sleep === null\)[\s\S]{0,80}都空着/.test(app));
check('sleep merges into the habit row of the day', app.includes("await api('/api/habits', {...(habitRowFor(activeDate) || {}), date: activeDate, sleep});"));
check('weight updates the same-day measurement instead of adding a row', app.includes("await api('/api/measurements', {...(measurementRowFor(activeDate) || {}), date: activeDate, weight});") && app.includes('function measurementRowFor(date)'));
check('the app reports what was stored', app.includes("feedback(message, `已记录：${saved.join('、')}。`);"));
check('the card is re-rendered with the day view', app.includes('    renderBodyQuick();'));

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
check('the two-things row is a two-column grid on a phone', css.includes('.quick-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
check('copy buttons are readable', css.includes('#copy-meal-buttons .button{justify-content:flex-start'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
