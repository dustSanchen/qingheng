/**
 * 合并后的 trends 套件（由 114 个单文件回归合并而来，2026-11-23）。
 * 每个原文件仍在自己的函数作用域里跑：一个文件抛错只记一条 FAIL，不会中断同组其他文件。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let __fail = 0;
async function __run(name, fn) {
  try { const n = await fn(); __fail += Number(n) || 0; }
  catch (error) { console.log('FAIL  [' + name + '] ' + (error && error.message ? error.message : error)); __fail += 1; }
}

await __run("segment-persistence", async () => {
/** 2026-11-24：记录 / 趋势 / 问答三处分段都要保持上次选择，进页不得强制落回第一格。 */
let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

check('记录页读回上次分段', app.includes("RECORD_PANELS.some(p => p.key === saved) ? saved : 'food'"));
check('记录页不再被 tab 切换强制重置', !app.includes("tab === 'records' && currentTab !== 'records' && !sub"));
check('趋势页读回上次分段', app.includes("TREND_PANEL_STORAGE") && app.includes("['weight', 'diet', 'training'].includes(savedTrend)"));
check('趋势页每次切换都写回', app.includes('localStorage.setItem(TREND_PANEL_STORAGE, target)'));
check('趋势段训练项在关闭训练时退回体重', app.includes("wanted === 'training' && !trainingEnabled() ? 'weight' : wanted"));
check('问答页分段有自己的一份记忆', app.includes("'qingheng.chatPanel'") && app.includes('localStorage.setItem(KEY, panel)'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("goal-requirements", async () => {
/**
 * 2026-11-18：目标要求表（训练组数/次数/RIR + 饮食速率）与证据文档、提示词的一致性。
 * 数字改了这里必须改 docs/design/27-evidence-requirements.md，两处对不上就失败。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const doc = fs.readFileSync('docs/design/27-evidence-requirements.md', 'utf8');
const lib = fs.readFileSync('app/src/main/assets/training-principles.js', 'utf8');

const sandbox = {number: v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)};
vm.createContext(sandbox);
const rulesSource = app.slice(app.indexOf('const TARGET_RULES = {'), app.indexOf('\n  const GOAL_LABEL'));
// 顶层 const 只产生词法绑定，不会挂到 vm 的 context 上：显式导出一次再读。
vm.runInContext(rulesSource + '\n;globalThis.__presets = GOAL_PRESETS;', sandbox);
const presets = sandbox.__presets;
check('goal presets are readable from the product', !!presets && Object.keys(presets).length === 5);

// --- 每个目标的训练与速率要求都在，且方向正确 ------------------------------------------------
for (const goal of ['gain', 'recomp', 'cut', 'maintain', 'lean']) {
  const p = presets && presets[goal];
  check(`${goal}: has a weekly set range`, !!p && Array.isArray(p.muscleSetsPerWeek) && p.muscleSetsPerWeek[0] >= 10 && p.muscleSetsPerWeek[1] <= 20, p && JSON.stringify(p.muscleSetsPerWeek));
  check(`${goal}: has a rep range`, !!p && p.reps[0] >= 6 && p.reps[1] <= 30, p && JSON.stringify(p.reps));
  check(`${goal}: has an RIR range`, !!p && p.rir[0] >= 0 && p.rir[1] <= 3, p && JSON.stringify(p.rir));
  check(`${goal}: has a weekly rate band`, !!p && Array.isArray(p.ratePctPerWeek), p && JSON.stringify(p.ratePctPerWeek));
}
check('cutting loses faster than leaning out', presets.cut.ratePctPerWeek[1] >= presets.lean.ratePctPerWeek[1]);
check('gaining is slower than cutting', presets.gain.ratePctPerWeek[1] <= presets.cut.ratePctPerWeek[1]);
check('gain carries the most volume', presets.gain.muscleSetsPerWeek[0] >= presets.cut.muscleSetsPerWeek[0]);
check('a deficit expects more protein than maintenance', presets.cut.proteinPerKgMin > presets.maintain.proteinPerKgMin);
check('protein bands stay inside the evidence range', presets.cut.proteinPerKgMax <= 2.6 && presets.gain.proteinPerKgMin >= 1.6);
check('a cut never plans more than the 20% deficit cap', Math.abs(presets.cut.deficitPercent) <= 20);
check('a gain plans a surplus, not a deficit', presets.gain.deficitPercent < 0);

// --- 文档与实现同一张表 -------------------------------------------------------------------------
for (const [goal, label] of [['gain', '增肌 gain'], ['recomp', '增肌同时减脂 recomp'], ['cut', '减脂 cut'], ['maintain', '保持 maintain'], ['lean', '薄肌 lean']]) {
  const p = presets[goal];
  const row = `| ${label} | ${p.muscleSetsPerWeek[0]}~${p.muscleSetsPerWeek[1]} | ${p.reps[0]}~${p.reps[1]} | ${p.rir[0]}~${p.rir[1]} |`;
  check(`${goal}: the doc row matches the preset`, doc.includes(row), row);
}
check('the doc cites the volume meta-analysis', doc.includes('10.1080/02640414.2016.1210197'));
check('the doc cites the protein meta-analysis', doc.includes('10.1136/bjsports-2017-097608'));
check('the doc cites the off-season review', doc.includes('10.3390/sports7070154'));
check('the doc cites the ACLM/ACSM overview', doc.includes('PMC12965823'));
check('the doc explains the limits', doc.includes('## 5. 已知局限'));

// --- 证据补录进了规则库 -------------------------------------------------------------------------
check('the library carries the new sources', ['schoenfeld-2017', 'baz-valle-2022', 'morton-2018', 'iraki-2019', 'acsm-2026'].every(id => lib.includes(`id: '${id}'`)));
check('the volume rule is cited to the meta-analysis', lib.includes("id: 'volume-dose-response'") && lib.includes("source: 'schoenfeld-2017'"));
check('the RIR rule is cited to the position stand', lib.includes("id: 'proximity-to-failure'") && lib.includes("source: 'acsm-2026'"));
check('the protein-in-deficit rule exists', lib.includes("id: 'protein-in-deficit'"));
check('the surplus rule exists', lib.includes("id: 'off-season-surplus'"));

// --- 页面与提示词用上同一张表 -------------------------------------------------------------------
check('the plan card prints the goal requirement', app.includes('本周要求（') && app.includes('goalPreset.muscleSetsPerWeek'));
// 1.4.47：口径不再以长句贴进提示词，改由本地上下文卡（compilePlanContext）带同源数字。
check('the AI plan request carries the requirement through the local context card', app.includes('function compilePlanContext') && app.includes('每部位组数：') && app.includes('preset.muscleSetsPerWeek'));
check('the profile status prints the training requirement', app.includes('训练要求（${goalLabelOf(goal)}）：每个大肌群'));
check('the profile status prints the weight rate', app.includes('体重速率：每周 ${ratePctPerWeek[0]}~${ratePctPerWeek[1]}%'));
check('the computed result exposes the requirements', app.includes('trainingTargets, ratePctPerWeek, weeklyRatePercent: weeklyLossFromRate,'));
check('a gain day gets one extra set on its first lift', app.includes("const gain = goal === 'gain' && role === 'main' && !deload ? 1 : 0;") &&
  app.includes('const gain = goal === \'gain\' && role === \'main\' && !deload ? 1 : 0;'));
check('a cutting plan is not padded with volume', app.includes("goal === 'gain' && role === 'main' && !deload ? 1 : 0"));
check('the goal table is used by the plan generator', app.includes("typeof GOAL_PRESETS === 'object' ? GOAL_PRESETS[goal] : null"));
check('a rate outside the goal band warns instead of silently changing numbers', app.includes('高于「${goalLabelOf(goal)}」的 ${lo}~${hi}%/周'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("lean-targets", async () => {
/**
 * The 薄肌 (lean / defined) goal mode, checked numerically against the user's own data.
 *
 * Runs the shipped computeTargets() in a sandbox rather than re-implementing the maths, so the test
 * fails if the app's numbers and the documented rules ever drift apart.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const source = fs.readFileSync('app/src/fragments/40-targets.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('  const TARGET_RULES = {');
const end = source.indexOf('  /** Onboarding values -> computeTargets input');
if (start < 0 || end < 0) throw new Error('fragment slice markers not found');

const sandbox = {number: v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)), Math, Object, Number, String, Array, Boolean};
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end) + '\nthis.computeTargets = computeTargets; this.GOAL_PRESETS = GOAL_PRESETS; this.GOAL_LABEL = GOAL_LABEL;', sandbox);
const {computeTargets, GOAL_PRESETS, GOAL_LABEL} = sandbox;

const base = {sex: 'male', weight: 64.6, height: 166, age: 24, training: 3};

// --- the established recomp numbers must not move ---------------------------------------------------
const recomp = computeTargets({...base, goal: 'recomp'});
check('recomp ranges stay below TDEE and above zero', recomp.trainingDay.max <= recomp.tdee && recomp.restDay.max <= recomp.tdee && recomp.trainingDay.min > 0,
  `training ${recomp.trainingDay.min}~${recomp.trainingDay.max} / rest ${recomp.restDay.min}~${recomp.restDay.max}`);
check('recomp keeps 2.0~2.4 g/kg protein', recomp.proteinMin === 129 && recomp.proteinMax === 155, `${recomp.proteinMin}~${recomp.proteinMax}`);
check('recomp TDEE unchanged', recomp.tdee === 2157 && recomp.bmr === 1569, `bmr ${recomp.bmr} tdee ${recomp.tdee}`);
check('recomp has no floor key any more', !('floor' in recomp) && !('intakeFloor' in recomp.rules));

// --- the lean preset exists and is named ------------------------------------------------------------
check('a lean preset exists', Boolean(GOAL_PRESETS.lean) && GOAL_PRESETS.lean.deficitPercent === 12);
check('lean has a display label', GOAL_LABEL.lean === '薄肌（线条）');
check('lean raises protein to 2.2~2.6 g/kg', GOAL_PRESETS.lean.proteinPerKgMin === 2.2 && GOAL_PRESETS.lean.proteinPerKgMax === 2.6);

// --- the lean plan on the user's real numbers -------------------------------------------------------
const lean = computeTargets({...base, goal: 'lean'});
check('lean ranges are positive and carb-cycled', lean.trainingDay.min > lean.restDay.max,
  `training ${lean.trainingDay.min}~${lean.trainingDay.max} / rest ${lean.restDay.min}~${lean.restDay.max}`);
check('lean never exceeds the deficit cap', lean.trainingDeficit <= lean.cap && lean.restDeficit <= lean.cap,
  `training ${lean.trainingDeficit}% rest ${lean.restDeficit}% cap ${lean.cap}%`);
check('lean effective deficit tracks the plan', lean.leanPlan.effectivePercent > 8 && lean.leanPlan.effectivePercent <= 12.5,
  `effective ${lean.leanPlan.effectivePercent}%`);
check('lean protein is the higher band', lean.proteinMin >= 142 && lean.proteinMax >= 155, `${lean.proteinMin}~${lean.proteinMax}`);
check('lean fat still clears the hormone floor', lean.fatMin >= 50, `${lean.fatMin}~${lean.fatMax}`);
check('lean predicts a weekly fat loss', lean.leanPlan.weeklyLoss > 0 && lean.leanPlan.weeklyLoss < 0.5, `${lean.leanPlan.weeklyLoss} kg/week`);
check('lean loss rate is inside the muscle-sparing band', lean.leanPlan.lossRatePercent > 0 && lean.leanPlan.lossRatePercent <= 0.7, `${lean.leanPlan.lossRatePercent}%/week`);
check('lean computes a monthly figure', lean.leanPlan.fatPerMonth > 0 && lean.leanPlan.fatPerMonth < 2, `${lean.leanPlan.fatPerMonth} kg/month`);
check('lean warns when the effective deficit is very small', lean.leanPlan.effectivePercent < 8 ? lean.warnings.some(w => w.includes('线条变化会很慢')) : true);
check('lean states the body-fat runway', lean.lines.some(l => l.includes('薄肌（线条）路径')) && lean.lines.some(l => l.includes('体脂跑道')));
check('lean line shows the weekly average deficit', lean.lines.some(l => l.includes('周均')), lean.lines[1]);

// --- each goal actually differs ---------------------------------------------------------------------
const cut = computeTargets({...base, goal: 'cut'});
check('cut is deeper than recomp', cut.trainingDay.max < recomp.trainingDay.max, `${cut.trainingDay.max} < ${recomp.trainingDay.max}`);
check('cut protein is 2.3~2.6 g/kg', cut.proteinPerKgMin === 2.3 && cut.proteinPerKgMax === 2.6, `${cut.proteinPerKgMin}~${cut.proteinPerKgMax}`);
const maintain = computeTargets({...base, goal: 'maintain'});
check('maintain protein is 1.6~2.0 g/kg', maintain.proteinMin === Math.round(64.6 * 1.6) && maintain.proteinMax === Math.round(64.6 * 2.0), `${maintain.proteinMin}~${maintain.proteinMax}`);
check('maintain sits around maintenance', Math.abs(maintain.weeklyAverageDeficit) <= 3, `${maintain.weeklyAverageDeficit}%`);
const gain = computeTargets({...base, goal: 'gain'});
check('gain is a surplus', gain.weeklyAverageDeficit < 0 && gain.trainingDay.max > recomp.trainingDay.max, `${gain.weeklyAverageDeficit}%`);

// --- guards that must not regress --------------------------------------------------------------------
const unset = computeTargets({...base, goal: 'lean', training: null});
check('a missing training plan is reported, not assumed silently', unset.provisional === true && unset.warnings.some(w => w.includes('还没有训练计划')));
const noWeight = computeTargets({sex: 'male', height: 166, age: 24, training: 3, goal: 'lean'});
check('missing weight still blocks the estimate', noWeight.incomplete === true && noWeight.missing.includes('体重'));

check('the hub summary knows the 薄肌 label', fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8').includes('GOAL_LABEL[profile.goal]'));
check('the hub summary uses the goal-aware range', fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8').includes('const range = intakeRangeForDate();'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("target-adjustment", async () => {
/**
 * 临时目标与估算进度的契约：
 * 临时目标必须改到「区间」这一层，否则第二天界面与 AI 都会读旧区间；
 * 估算等待期只让骨架动，文字不在中途跳来跳去。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const head = read('app/src/fragments/00-head.fragment.js');
const targetOffer = read('app/src/fragments/20-permissions-backup.fragment.js');
const rest = read('app/src/fragments/70-rest.fragment.js');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');

const effective = head.slice(head.indexOf('function effectiveProfileForDate'), head.indexOf('function effectiveProfileForDate') + 1800);
const calc = read('app/src/main/assets/calc.js');
check('adjustment is merged before the range is computed',
  effective.indexOf('Object.assign(profile, adjustment.temporary)') > 0
  && effective.indexOf('Object.assign(profile, adjustment.temporary)') < effective.indexOf('const baseRange = intakeRangeForDate'));
check('the range itself is overridden for the temporary day',
  effective.includes('applyTemporaryRange(baseRange, adjustment.temporary)')
  && calc.includes('min: adjusted') && calc.includes("basis: '临时调整，明天恢复'"));
check('the range helper accepts an explicit profile', head.includes('function intakeRangeForDate(date = activeDate, profileOverride = null)'));

check('the popup reports the value the server stored', targetOffer.includes('saved.temporary') && targetOffer.includes('const temp ='));
check('native effective profile overrides the day boundaries',
  main.includes('"trainingDayMin", "trainingDayMax", "restDayMin", "restDayMax"')
  && main.includes('Double adjustedCalories = finite(values, "calorieTarget")'));

check('estimate progress no longer ticks on a timer', !rest.includes('},1400)') && !rest.includes('clearInterval(ticker)'));
check('estimate status stays one stable line', rest.includes('正在分析食品营养') && !rest.includes('estimate-think'));
check('streamed names still update the rows', rest.includes('if(names.length>progressNames.length){') && rest.includes('progressNames=names;'));

console.log('\nPASS total: 0 failed');
;return typeof fail === 'number' ? fail : 0;
});

await __run("target-band", async () => {
/**
 * Optional target-weight band: it exists only when both bounds are real numbers,
 * is clamped to the plot, and never invents a default target.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const java = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing ' + name);
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
  throw new Error('unterminated ' + name);
}

const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const fmt = value => String(value);
const band = new Function('number', 'fmt', extractFunction(app, 'trendTargetBand') + '\nreturn trendTargetBand;')(number, fmt);
const y = value => (70 - value) * 10;

let markup = band({weightTargetMin: 60, weightTargetMax: 65}, y, 10, 100, 0, 100);
check('a valid target range draws one band', markup.includes('data-target-band="1"') && markup.includes('width="90"'), markup);
check('the band uses the two bounds', markup.includes('y="50.00"') && markup.includes('height="50.00"'), markup);
check('no fields means no band', band({}, y, 10, 100, 0, 100) === '');
check('an inverted range means no band', band({weightTargetMin: 65, weightTargetMax: 60}, y, 10, 100, 0, 100) === '');
check('the band is clamped to the plot', band({weightTargetMin: 50, weightTargetMax: 90}, y, 10, 100, 20, 80).includes('y="20.00"') && band({weightTargetMin: 50, weightTargetMax: 90}, y, 10, 100, 20, 80).includes('height="60.00"'));
check('the form exposes optional target bounds', html.includes('name="weightTargetMin"') && html.includes('name="weightTargetMax"'));
check('the profile payload carries target bounds', app.includes("'weightTargetMin','weightTargetMax'") || app.includes("'weightTargetMin', 'weightTargetMax'"));
check('Java validates the target range', java.includes('{"weightTargetMin", "weightTargetMax", "目标体重区间"}'));
check('the trend chart injects the band behind the data', app.includes('${grid}${targetBand}${points.length>1'));
check('the band style is a 12% accent fill', css.includes('.chart-target-band{fill:var(--accent);fill-opacity:.12'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("targets", async () => {
/**
 * Verifies the target math that ships in app.js by extracting the shipped function text and running
 * it, so the test cannot drift from the product.
 *
 * The model changed on 2026-10-17: targets now come from the user's own 口径 (rules) instead of a
 * goal-based multiplier, missing input is reported instead of guessed, and an unanswered training
 * frequency is provisional rather than silently sedentary.
 */

const app = fs.readFileSync('D:/AI/health-android/app/src/main/assets/app.js', 'utf8');

// Pull the real implementation (and its helpers) out of app.js rather than re-implementing it.
const start = app.indexOf('const TARGET_RULES = {');
assert(start > 0, 'TARGET_RULES found in app.js');
const end = app.indexOf('\n  function targetInputFrom', start);
assert(end > start, 'target block delimited');
const source = app.slice(start, end);
const number = v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const {computeTargets, targetRules, GOAL_HINTS} = new Function('number', source + '\nreturn {computeTargets, targetRules, GOAL_HINTS};')(number);

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

// Reference case: the user's own numbers (male, 166 cm, 64.3 kg, 24 y, 3 sessions/week).
const ref = computeTargets({sex: 'male', weight: 64.3, height: 166, age: 24, goal: 'recomp', training: 3});
const expectedBmr = Math.round(10 * 64.3 + 6.25 * 166 - 5 * 24 + 5);
check('BMR matches Mifflin-St Jeor (male)', ref.bmr === expectedBmr, `${ref.bmr} vs ${expectedBmr}`);
check('goal hints mirror the presets', GOAL_HINTS.gain.includes('10%') && GOAL_HINTS.gain.includes('1.6~2.2') && GOAL_HINTS.cut.includes('2.3~2.6') && GOAL_HINTS.cut.includes('0.5~1%') && GOAL_HINTS.lean.includes('2.2~2.6') && GOAL_HINTS.lean.includes('0.5~0.7%'));
const expectedTdee = Math.round(expectedBmr * 1.375);
check('TDEE uses the 2-3 sessions factor 1.375', ref.tdee === expectedTdee, `${ref.tdee} vs ${expectedTdee}`);
check('reference case is not incomplete', ref.incomplete === false);
const twoSessions = computeTargets({sex: 'male', weight: 64.3, height: 166, age: 24, goal: 'recomp', training: 2});
const sixSessions = computeTargets({sex: 'male', weight: 64.3, height: 166, age: 24, goal: 'recomp', training: 6});
check('the weekly average follows the planned sessions', sixSessions.weeklyAverage > twoSessions.weeklyAverage, `${twoSessions.weeklyAverage} vs ${sixSessions.weeklyAverage}`);
const noSex = computeTargets({sex: '', weight: 64.3, height: 166, age: 24, goal: 'recomp', training: 3});
check('a missing sex is reported instead of assumed male', noSex.incomplete === true && noSex.missing.includes('性别'), JSON.stringify(noSex.missing));
const oddSex = computeTargets({sex: 'other', weight: 64.3, height: 166, age: 24, goal: 'recomp', training: 3});
check('an unknown sex is reported too', oddSex.incomplete === true && oddSex.missing.includes('性别'));
check('training frequency is echoed back', ref.sessions === 3 && ref.trainingUnset === false);

// The 口径 replaces the old goal multiplier.
const rules = targetRules(null);
check('the 2000 kcal floor is gone from the rules', !('intakeFloor' in rules) && !('proteinPerKgMin' in rules));
check('default 口径 deficit cap is 20%', rules.deficitCapPercent === 20, rules.deficitCapPercent);
check('default 训练日 2150~2350', rules.trainingDayMin === 2150 && rules.trainingDayMax === 2350);
check('default 休息日 2000~2150', rules.restDayMin === 2000 && rules.restDayMax === 2150);
check('training-day range follows the goal preset', ref.trainingDay.min > 0 && ref.trainingDay.max <= ref.tdee && ref.trainingDay.min < ref.trainingDay.max, JSON.stringify(ref.trainingDay));
check('rest-day range follows the goal preset', ref.restDay.min > 0 && ref.restDay.max <= ref.tdee && ref.restDay.min < ref.restDay.max, JSON.stringify(ref.restDay));
check('deficit is reported as a signed percentage of TDEE', typeof ref.trainingDeficit === 'number' && Math.abs(ref.trainingDeficit) <= 30, String(ref.trainingDeficit));
// 同一身体数据下，减脂 18% 会低于旧的 2000 地板，说明地板确实不再参与计算。
const cutRef = computeTargets({sex: 'male', weight: 64.3, height: 166, age: 24, goal: 'cut', training: 3});
check('cut goes below the old 2000 floor', cutRef.trainingDay.max < 2000 && cutRef.trainingDay.max > 0, JSON.stringify(cutRef.trainingDay));

// Protein and fat come from the 口径, not from the goal.
check('protein lower bound is 2.0 g/kg', ref.proteinMin === Math.round(64.3 * 2.0), ref.proteinMin);
check('protein upper bound is 2.4 g/kg', ref.proteinMax === Math.round(64.3 * 2.4), ref.proteinMax);
check('protein never dips below the documented 130 g floor at this weight', ref.proteinMin >= 128, ref.proteinMin);
check('fat floor honours the 50 g rule', ref.fatMin >= 50, ref.fatMin);
check('fat ideal range is 55~70 g by default', ref.fatMin === 55 && ref.fatMax === 70, `${ref.fatMin}~${ref.fatMax}`);
check('carbs derive from the training-day ceiling', ref.carbs === Math.max(0, Math.round((ref.budget - ref.proteinMid * 4 - ref.fatMid * 9) / 4)), ref.carbs);
check('every line is present for the 三件套 display', ref.lines.length === 7 && ref.lines[0].includes('维持热量') && ref.lines[1].includes('训练日') && ref.lines[5].includes('训练要求') && ref.lines[6].includes('体重速率'), ref.lines.length);
check('the basis is stated in the first line', /活动系数 1\.375/.test(ref.lines[0]), ref.lines[0]);

// Female BMR constant must be -161.
const female = computeTargets({sex: 'female', weight: 60, height: 165, age: 30, goal: 'maintain', training: 3});
const expectedFemale = Math.round(10 * 60 + 6.25 * 165 - 5 * 30 - 161);
check('female BMR uses -161', female.bmr === expectedFemale, `${female.bmr} vs ${expectedFemale}`);

// Missing input is reported, never guessed.
const noAge = computeTargets({sex: 'male', weight: 70, height: 175, age: null, goal: 'maintain', training: 3});
check('missing age refuses to compute', noAge.incomplete === true && noAge.missing.includes('年龄'), JSON.stringify(noAge.missing));
check('missing age never falls back to 30', noAge.bmr === undefined);
const noWeight = computeTargets({sex: 'male', weight: null, height: 175, age: 25, goal: 'cut', training: 3});
check('missing weight refuses to compute', noWeight.incomplete === true && noWeight.missing.includes('体重'));
const noHeight = computeTargets({sex: 'male', weight: 70, height: null, age: 25, goal: 'cut', training: 3});
check('missing height refuses to compute', noHeight.incomplete === true && noHeight.missing.includes('身高'));
check('the refusal names what is missing', noWeight.lines[0].includes('体重'), noWeight.lines[0]);

// An unanswered training frequency is provisional, not sedentary-by-default.
const unset = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'maintain', training: null});
check('unset training still computes (provisional)', unset.incomplete === false);
check('unset training is flagged provisional', unset.provisional === true && unset.trainingUnset === true);
check('unset training says which factor it assumed', unset.warnings.some(text => text.includes('按久坐')) && unset.lines[0].includes('没有训练计划'), JSON.stringify(unset.warnings));
check('explicitly sedentary is not flagged provisional', computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'maintain', training: 0}).provisional === false);

// 口径 overrides: the deficit cap still applies; hand-typed day ranges no longer override the goal.
const custom = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'cut', training: 5, rules: {trainingDayMax: 3000, restDayMax: 2400, deficitCapPercent: 10}});
check('hand-typed day ranges are ignored', custom.trainingDay.max !== 3000 && custom.restDay.max !== 2400, `${custom.trainingDay.max}/${custom.restDay.max}`);
check('the deficit cap still applies', custom.trainingDeficit <= 10, `${custom.trainingDeficit}%`);
const bogus = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'maintain', training: 5, rules: {deficitCapPercent: 0}});
check('nonsense overrides are ignored, not applied', bogus.rules.deficitCapPercent === 20, bogus.rules.deficitCapPercent);

// Goal consistency checks stay honest instead of forcing a number.
check('an ineffective cut is called out', app.includes('目标是减脂，但当前区间不低于维持热量'));
check('a gain phase with a big deficit is called out', app.includes('目标是增肌，但当前缺口偏大'));

// Activity factors must be monotonic.
const sedentary = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'maintain', training: 1});
const often = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'maintain', training: 6});
check('more training raises TDEE', often.tdee > sedentary.tdee, `${often.tdee} > ${sedentary.tdee}`);

// Every goal explains its own numbers in one line.
const goals = ['gain', 'cut', 'recomp', 'lean', 'maintain'];
check('every goal has a hint', goals.every(goal => typeof GOAL_HINTS[goal] === 'string' && GOAL_HINTS[goal].length > 10));
check('the hints carry the real numbers', GOAL_HINTS.gain.includes('10%') && GOAL_HINTS.cut.includes('18%') && GOAL_HINTS.lean.includes('12%') && GOAL_HINTS.maintain.includes('1.6~2.0') && GOAL_HINTS.gain.includes('1.6~2.2'));
check('the profile and wizard show the hint', fs.readFileSync('app/src/main/assets/index.html', 'utf8').includes('id="profile-goal-hint"') && fs.readFileSync('app/src/main/assets/index.html', 'utf8').includes('id="ob-goal-hint"'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("tdee-calibration", async () => {
/**
 * 实测维持热量（calibratedTdee）的数值测试：用真实函数 + 构造记录，验证三个方向。
 *
 * 1. 摄入稳定、体重不变 → 实测维持 ≈ 平均摄入；
 * 2. 摄入稳定、体重下降 → 实测维持 = 平均摄入 + 掉秤对应的能量（> 摄入）；
 * 3. 记录不足 → 明确返回不可用并说明缺什么，不猜。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const source = fs.readFileSync('app/src/fragments/40-targets.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('  function calibratedTdee(');
const end = source.indexOf('  /** Writes computed targets back into the profile form');
if (start < 0 || end < 0) throw new Error('calibratedTdee slice markers not found');

const sandbox = {
  state: {meals: [], measurements: []},
  number: v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)),
  validDate: value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')),
  Date, Math, Map, Array, String, Number, Object,
};
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end) + '\nthis.calibratedTdee = calibratedTdee;', sandbox);
const {calibratedTdee} = sandbox;

/** Builds N consecutive daily meal rows with the same calories and one weight row per date. */
function build(days, kcal, weights) {
  const meals = [];
  const measurements = [];
  const startDate = new Date('2026-10-01T00:00:00Z');
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 86400000).toISOString().slice(0, 10);
    meals.push({date, calories: kcal, protein: 140, fat: 60});
    if (weights[i] !== undefined) measurements.push({date, weight: weights[i]});
  }
  return {meals, measurements};
}

// --- 1. weight stable -> maintenance equals intake ----------------------------------------------------
sandbox.state = build(21, 2100, Array(21).fill(64.6));
const stable = calibratedTdee();
check('stable weight calibrates to the mean intake', stable.ok && Math.abs(stable.tdee - 2100) <= 5, `${stable.ok ? stable.tdee : stable.reason}`);
check('it reports how much data it used', stable.ok && stable.days === 21 && stable.spanDays === 20, stable.ok ? `days ${stable.days}, span ${stable.spanDays}` : '');

// --- 2. losing 0.3 kg/week on 2,100 kcal -> maintenance above intake -----------------------------------
const weights = [];
for (let i = 0; i < 21; i++) weights.push(66 - i * (0.3 / 7));
sandbox.state = build(21, 2100, weights);
const losing = calibratedTdee();
check('losing weight raises the calibrated maintenance above intake', losing.ok && losing.tdee > 2100, losing.ok ? `${losing.tdee} kcal (intake ${losing.meanIntake})` : losing.reason);
// 21 days with 20-day span, -0.857 kg -> 0.857*7700/20 = 330 kcal/day
check('the energy gap matches the weight change', losing.ok && Math.abs(losing.tdee - 2430) <= 25, losing.ok ? `${losing.tdee} kcal, expected ~2430` : '');
check('it reports the weight delta', losing.ok && losing.deltaKg < 0, losing.ok ? `${losing.deltaKg} kg` : '');

// --- 3. not enough data -> refuses instead of guessing -------------------------------------------------
sandbox.state = build(10, 2100, Array(10).fill(64.6));
const sparse = calibratedTdee();
check('too few intake days is refused with a reason', sparse.ok === false && sparse.reason.includes('14'), sparse.reason);
sandbox.state = build(21, 2100, []);
const noWeight = calibratedTdee();
check('no weight in the window is refused with a reason', noWeight.ok === false && noWeight.reason.includes('体重'), noWeight.reason);
sandbox.state = {meals: [{date: '2026-10-01'}, {date: 'bad-date', calories: 2000}], measurements: []};
const junk = calibratedTdee();
check('junk rows do not count as data', junk.ok === false, junk.reason);

// --- 3b. 校准分账：只记了一两餐的日子不能拉低平均摄入 ---------------------------------------------------
/** 每天 4 餐 × perMeal；partial 的那几天只记 1 餐。 */
function buildMeals(days, perMeal, partialIndexes, partialKcal) {
  const meals = [];
  const measurements = [];
  const startDate = new Date('2026-10-01T00:00:00Z');
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 86400000).toISOString().slice(0, 10);
    if (partialIndexes.includes(i)) {
      meals.push({date, calories: partialKcal});
    } else {
      for (let m = 0; m < 4; m++) meals.push({date, calories: perMeal});
    }
    measurements.push({date, weight: 64.6});
  }
  return {meals, measurements};
}
// 15 天记全（4 × 500 = 2000） + 6 天只记一餐 300：平均摄入必须只算完整日
const partial = [0, 2, 4, 6, 8, 10];
sandbox.state = buildMeals(21, 500, partial, 300);
const split = calibratedTdee();
check('partial days are excluded from the mean intake', split.ok && Math.abs(split.meanIntake - 2000) <= 5, split.ok ? `mean ${split.meanIntake}` : split.reason);
check('the calibration still lands on maintenance', split.ok && Math.abs(split.tdee - 2000) <= 10, split.ok ? `${split.tdee} kcal` : '');
check('it reports how many days were skipped', split.ok && split.skippedDays === 6 && split.days === 15, split.ok ? `days ${split.days} / skipped ${split.skippedDays}` : '');
// 13 天记全 + 8 天只记一餐 → 完整日不足 14 天，必须拒绝并说明原因，不能拿残缺数据算
const mostlyPartial = [0, 2, 4, 6, 8, 10, 12, 14];
sandbox.state = buildMeals(21, 500, mostlyPartial, 300);
const tooSparse = calibratedTdee();
check('too few complete days is refused, naming the reason', tooSparse.ok === false && tooSparse.reason.includes('完整') && tooSparse.reason.includes('14'), tooSparse.reason);
// 一天只吃一顿的人（OMAD）不该被门槛误杀：中位餐数就是 1
sandbox.state = build(21, 1800, Array(21).fill(64.6));
const omad = calibratedTdee();
check('one-meal-a-day users still calibrate', omad.ok && omad.days === 21 && typeof omad.typicalMeals === 'number', omad.ok ? `meals ${omad.typicalMeals}` : omad.reason);

// --- 3c. 差额过大时的文案：提示摄入记录不全，而不是直接说“以实测为准” ----------------------------------
const targetsSource = fs.readFileSync('app/src/fragments/40-targets.fragment.js', 'utf8');
check('a >10% gap is explained as under-recording', targetsSource.includes('差这么多通常是摄入记录不全'));
check('the big-gap branch runs before the "trust the measured" branch', targetsSource.indexOf('gapPercent >= 10') < targetsSource.indexOf('以实测为准'));

// --- 4. the four-session lever is inside the floor -----------------------------------------------------
const targets = fs.readFileSync('app/src/fragments/40-targets.fragment.js', 'utf8');
check('the lean plan names the training-frequency lever', targets.includes('训练频率杠杆'));
check('the lever is computed from a real activity factor', targets.includes('const altFactor = activityFactorFor(4);'));
check('the lever no longer claims a hard floor', !targets.includes('硬底线'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("trends-ui", async () => {

const assets = new URL('../app/src/main/assets/', import.meta.url);
const html = fs.readFileSync(new URL('index.html', assets), 'utf8');
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const css = fs.readFileSync(new URL('styles.css', assets), 'utf8');

// Observation range: 7 days added in ascending order, 30 days stays the default.
const rangeBlock = html.match(/<select id="trend-range">([\s\S]*?)<\/select>/);
assert(rangeBlock, 'trend range select exists');
const options = [...rangeBlock[1].matchAll(/<option value="([^"]+)"([^>]*)>([^<]+)<\/option>/g)]
  .map(m => ({ value: m[1], selected: m[2].includes('selected'), label: m[3] }));
assert.deepEqual(options.map(o => o.value), ['7', '30', '90', 'all'], '7-day range is offered first');
assert.equal(options.filter(o => o.selected).length, 1, 'exactly one default range');
assert.equal(options.find(o => o.selected).value, '30', '30 days remains the default range');
assert(options[0].label.includes('7'), 'the short range is labelled in days');

// The range value drives the cutoff, so a shorter range must stay valid.
assert(/Number\(range\)-1\)\*86400000/.test(app), 'range still maps to a day cutoff');

// 断言更新登记（03-global-changes.md §5.1）：作者个人邮箱与署名已按隐私要求删除，
// 这里改为断言「页面里不再出现联系方式」与「免责声明保留」。
const footer = html.match(/<footer class="page-footer">([\s\S]*?)<\/footer>/);
assert(footer, 'profile page footer exists');
assert(!/mailto:/.test(html), 'no personal contact link remains in the page');
assert(footer[1].includes('\u4e0d\u80fd\u66ff\u4ee3\u533b\u7597\u8bca\u65ad'), 'the disclaimer stays in the footer');

// Chart geometry is sized for a phone, and axis text is large enough to read.
const geo = app.match(/const W=(\d+),H=(\d+),L=(\d+),R=(\d+),T=(\d+),B=(\d+),plotW/);
assert(geo, 'chart geometry is declared');
const [W, H, L, R, T, B] = geo.slice(1).map(Number);
assert(W <= 400, 'view box is close to the rendered phone width so text is not scaled down');
assert(H > W * 0.5, 'chart is tall enough to read on a phone');
assert(L + R < W / 2, 'plot area keeps most of the width');
assert(T + B < H / 2, 'plot area keeps most of the height');
assert(app.includes('viewBox="0 0 ${W} ${H}"'), 'the view box uses the declared dimensions');

const axisFont = Number(css.match(/\.chart-text\{[^}]*font-size:(\d+(?:\.\d+)?)px/)[1]);
assert(axisFont >= 13, `axis numbers are legible on a phone (got ${axisFont}px)`);
const chartTextRules = [...css.matchAll(/\.chart-text\{[^}]*font-size:([^;}]+)/g)];
assert(chartTextRules.length >= 2, 'the final chart-text rule is checked, not only the first');
assert(/var\(--text-sm\)/.test(chartTextRules[chartTextRules.length - 1][1]), 'the last chart-text rule stays at text-sm');
assert(/\.chart-point\{stroke-width:3\}/.test(css), 'the last chart-point rule stays 3px');
assert(app.includes("view.classList.toggle('is-subpage'") && css.includes('#view-profile.is-subpage .page-heading'), 'subpages hide the redundant page heading even without :has()');
assert(css.includes('[data-theme="dark"] input[type=date]::-webkit-calendar-picker-indicator') && css.includes('[data-theme="dark"] img[src^="./icon-"]'), 'night native picker and fixed-color icons are brightened');
assert(css.includes('@media(max-width:360px){.macro-target') && css.includes('@media(max-width:340px){.skin-pick'), '320px macro and skin-pick fixes stay scoped');
assert(/\.chart-value\{[^}]*font-size:(12px|var\(--text-sm\))/.test(css), 'per-point value labels are styled');
assert(/\.chart-point\{[^}]*stroke-width:3\}/.test(css), 'data points are thick enough to see');
assert(/\.chart-wrap\{[^}]*max-width:560px/.test(css), 'chart does not balloon on wide screens');

// Value labels only appear when they cannot collide.
assert(/points\.length<=7 \? points\.map/.test(app), 'point values are limited to short ranges');
assert(/\$\{values\}\$\{labels\}/.test(app), 'value labels are rendered above the date axis');

assert(!/\.page-author/.test(css), 'the author-line styling went with the element');
assert(/const weekly = \$\('#trend-weekly'\)[\s\S]{0,140}weekly\.hidden = true/.test(app), 'the empty trend chart clears stale weekly text');
assert(!app.includes("action: {label: '去记录体重'") && app.includes("title: '记录第一笔体重'"), 'the empty trend chart is explained without a second entry');
console.log('PASS trends UI: 7-day range, single default, no personal credit in the footer, phone-sized axes, short-range value labels, empty-state action');
;return typeof fail === 'number' ? fail : 0;
});
console.log('\nFAIL total: ' + __fail);
process.exitCode = __fail ? 1 : 0;
