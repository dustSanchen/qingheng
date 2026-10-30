/**
 * Step 6 checks: the training log keeps one habit row per day, volume is computed honestly, and the
 * progressive-overload view refuses to compare a single week.
 */
import fs from 'node:fs';

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
check('an exercise row asks for sets, reps and weight', html.includes('id="training-exercises"') && app.includes('data-exercise="sets"') && app.includes('data-exercise="reps"') && app.includes('data-exercise="weight"'));
check('up to twelve exercises are allowed', app.includes("if (index >= 12) {notice('一次最多记录 12 个动作。', true); return;}"));
// 断言更新登记（03-global-changes.md §5 第 3 条）：实现从「整表单一次性拒绝」改为
// 「逐字段 aria-invalid + 聚焦第一个缺失项」，语义未变，故改断言到现役实现。
check('an incomplete exercise is refused instead of stored',
  app.includes("markFieldInvalid(field, '请补全这个动作的记录。')")
  && app.includes("'每个动作都要填完整：名称、组数、次数、负重；不想记的动作请先移除。'")
  && app.includes('missing[0]?.focus();'));
check('saving marks the day as trained', app.includes('await api(\'/api/habits\', {...existing, date: activeDate, training: true, template:'));
check('the log keeps other fields of the day row', app.includes('const existing = habitRowFor(activeDate) || {};'));
check('clearing keeps the rest of the day row', app.includes('习惯行的其他数据（步数、睡眠、饮水、用油）会保留'));
check('the tag summarises what is logged', app.includes('`${TRAINING_TEMPLATES[template]} · ${exercises.length} 个动作`'));

// --- one row per day ------------------------------------------------------------------------------------
check('a habit-row lookup exists', app.includes('function habitRowFor(date)'));
check('duplicate rows are resolved by keeping the fullest', app.includes('rows.slice().sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0]'));
check('the daily-three submit merges instead of appending', app.includes("await api('/api/habits', {...(habitRowFor(activeDate) || {}), date: activeDate,"));
check('the training log reads back the stored exercises', app.includes('function exercisesFor(date)'));

// --- volume maths -----------------------------------------------------------------------------------------
check('volume is sets × reps × weight', app.includes('return sets * reps * weight;'));
check('a missing factor yields null instead of a wrong number', app.includes('if (sets === null || reps === null || weight === null) return null;'));
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
check('AI plan rows carry the model reason', app.includes('ai-plan-reason') && app.includes('一句话为什么排它'));
check('the plan row keeps name, advice and dose in one text column', app.includes('ai-plan-text') && css.includes('.ai-plan-text{display:flex;flex-direction:column'));
check('the dose sits below the model advice', /ai-plan-reason[\s\S]{0,120}ai-plan-dose/.test(app));
check('a checked row strikes the name inside the text column', css.includes('.ai-plan-row input:checked ~ .ai-plan-text .ai-plan-name'));
check('edit rows label their inputs in Chinese', app.includes('组数') && app.includes('负重公斤') && !app.includes('aria-label="sets"'));
check('edit mode can add a blank row and keeps the reason visible', app.includes('data-ai-append') && app.includes('ai-plan-edit-reason') && app.includes('一份清单最多 12 个动作'));
check('only the checkbox uses order:-1 so edit inputs keep their grid slot', css.includes('.ai-plan-row input[type=checkbox]{order:-1') && !css.includes('.ai-plan-row input{order:-1'));
check('removing a row names it from the edit input too', app.includes('已移除这个动作') && app.includes('nameField.value'));
check('askAiPlan sees the same baselines as the rule engine', app.includes('function recentExerciseBaselines') && app.includes('上周最近记录（供渐进参考'));
check('askAiPlan follows the training library', /askAiPlan[\s\S]{0,3400}librarySummary\(6\)/.test(app));
check('run km/minutes inherit by name, not by row index', app.includes('runsByName') && !app.includes('exercisesFor(activeDate)[index]'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
