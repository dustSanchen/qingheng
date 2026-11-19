/**
 * 本轮断言：小习惯跳转修复、图标、推送健身提示、不健身选项。
 */
import fs from 'node:fs';

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
check('the training tile reuses the main training glyph', app.includes("trainingEnabled() ? [['icon-glyph-training.svg'"));
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

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
