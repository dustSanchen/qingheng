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

// --- today's three things ---------------------------------------------------------------------------
check('the card exists on the today page', html.includes('<article class="card" id="daily-three">'));
check('it asks for exactly the three documented things', html.includes('name="training"') && html.includes('name="sleep"') && html.includes('name="weight"'));
check('cooking oil is explained in spoons', html.includes('1 勺≈10 g≈90 kcal'));
check('weight is asked for under the documented conditions', html.includes('空腹、同一状态'));
check('the card is prefilled from the day being viewed', app.includes("const habit = (state.habits || []).find(row => row && row.date === activeDate) || {};") && app.includes("const measurement = (state.measurements || []).find(row => row && row.date === activeDate) || {};"));
check('a three-part tag shows progress', app.includes("filled === 3 ? '已记录三样' : `已记录 ${filled}/3`"));
check('an empty submit is refused', /if \(trainingValue === '' && sleep === null && weight === null\)[\s\S]{0,40}三样都空着/.test(app));
check('training and oil go to the habit row', app.includes("await api('/api/habits', {...(habitRowFor(activeDate) || {}), date: activeDate,"));
check('weight goes to the measurements', app.includes("await api('/api/measurements', {date: activeDate, weight});"));
check('the app reports what was stored', app.includes("feedback(message, `已记录：${saved.join('、')}。`);"));
check('the card is re-rendered with the day view', app.includes('    renderDailyThree();'));

// --- native validation for the habit row --------------------------------------------------------------
check('habits are validated natively', main.includes('private void requireHabitFields(JSONObject record)'));
check('the habit date must be valid', /requireHabitFields[\s\S]{0,200}validDay\(record\.optString\("date"/.test(main));
check('oil spoons are bounded', main.includes('key.equals("water") ? 20000 : 30'));
check('habit validation runs on save', main.includes('if (collection.equals("habits")) requireHabitFields(record);'));

// --- copying a meal -----------------------------------------------------------------------------------
check('the copy card exists on the records page', html.includes('<article class="card" id="copy-meal">'));
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
check('the three-things card is single column on a phone', css.includes('#daily-three .form-grid{grid-template-columns:1fr}'));
check('copy buttons are readable', css.includes('#copy-meal-buttons .button{justify-content:flex-start'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
