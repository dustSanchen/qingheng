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

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
