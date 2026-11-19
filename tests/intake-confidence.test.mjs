/**
 * 记录可信度（2026-11-19，1.4.56）。
 * 这是本 App 最重要的一条自我约束：热量是估的，估的基础是记录完整度。
 * 单测直接用真实函数 + 构造记录，验证四档与扣分原因，不看文案拼写。
 */
import fs from 'node:fs';
import vm from 'node:vm';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const source = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('  function intakeConfidence(date = activeDate) {');
const end = source.indexOf('  function recordIntakeConfidence() {');
if (start < 0 || end < 0) throw new Error('intakeConfidence slice markers not found');

const sandbox = {
  state: {meals: []},
  activeDate: '2026-11-19',
  number: v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)),
  shiftDay: (date, offset) => new Date(Date.parse(date + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10),
  Date, Math, Array, Object, Number, String, JSON,
};
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end) + '\nthis.intakeConfidence = intakeConfidence;', sandbox);
const confidence = sandbox.intakeConfidence;

const day = (date, extra = {}) => ({date, calories: 600, protein: 30, fat: 20, carbs: 60, oilGrams: 10, oilIncluded: true, items: [{name: '米饭', grams: 200}], ...extra});

// --- 1. 记录完整：四餐、油与逐项都在、近 7 天每天都记 -----------------------------------------------
sandbox.state.meals = ['2026-11-19', '2026-11-18', '2026-11-17', '2026-11-16', '2026-11-15', '2026-11-14', '2026-11-13']
  .flatMap(d => [day(d), day(d), day(d), day(d)]);
const full = confidence();
check('a fully recorded day reads as high confidence', full.level === 'high' && full.score === 100, `${full.level}/${full.score}`);

// --- 2. 只记一餐：必须降到低，并点名餐数 -------------------------------------------------------------
sandbox.state.meals = [day('2026-11-19')];
const oneMeal = confidence();
check('one meal alone is low confidence', oneMeal.level === 'low', `${oneMeal.level}/${oneMeal.score}`);
check('it names the meal count as the reason', oneMeal.reasons.some(text => text.includes('只记了 1 餐')), oneMeal.reasons.join(' | '));

// --- 3. 四餐但没标用油：中/低，并点名用油 -------------------------------------------------------------
sandbox.state.meals = ['2026-11-19', '2026-11-18', '2026-11-17', '2026-11-16', '2026-11-15']
  .flatMap(d => [day(d, {oilGrams: null, oilIncluded: false}), day(d, {oilGrams: null, oilIncluded: false}), day(d, {oilGrams: null, oilIncluded: false}), day(d, {oilGrams: null, oilIncluded: false})]);
const noOil = confidence();
check('missing cooking oil costs points', noOil.score < 100 && noOil.reasons.some(text => text.includes('用油')), `${noOil.level}/${noOil.score} · ${noOil.reasons.join(' | ')}`);

// --- 4. 只有总数、没有逐项：扣分 ---------------------------------------------------------------
sandbox.state.meals = ['2026-11-19', '2026-11-18', '2026-11-17', '2026-11-16', '2026-11-15']
  .flatMap(d => [day(d, {items: []}), day(d, {items: []}), day(d, {items: []}), day(d)]);
const noItems = confidence();
check('missing per-item detail costs points', noItems.reasons.some(text => text.includes('逐项')), noItems.reasons.join(' | '));

// --- 5. 空白：不参与评分，也不显示 ---------------------------------------------------------------
sandbox.state.meals = [];
const empty = confidence();
check('a day with no records has no level at all', empty.level === 'none', empty.level);

// --- 6. 接线：只存内部，不对外展示 ---------------------------------------------------------------------
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
check('the confidence is recorded on every render', app.includes('recordIntakeConfidence();'));
check('it is stored under a local key', app.includes('qingheng.intakeConfidence'));
check('other modules can ask for a day level', app.includes('function intakeConfidenceLevelFor'));
check('low-confidence days are excluded from calibration', app.includes('intakeConfidenceLevelFor(date) !== \'low\''));
check('the user-facing confidence line is gone', !html.includes('id="intake-confidence"') && !app.includes('记录可信度：'));
check('the calorie number is no longer prefixed with ≈', !app.includes("(confidence.level === 'low' ? '≈' : '')"));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
