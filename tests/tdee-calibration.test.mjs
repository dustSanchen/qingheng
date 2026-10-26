/**
 * 实测维持热量（calibratedTdee）的数值测试：用真实函数 + 构造记录，验证三个方向。
 *
 * 1. 摄入稳定、体重不变 → 实测维持 ≈ 平均摄入；
 * 2. 摄入稳定、体重下降 → 实测维持 = 平均摄入 + 掉秤对应的能量（> 摄入）；
 * 3. 记录不足 → 明确返回不可用并说明缺什么，不猜。
 */
import fs from 'node:fs';
import vm from 'node:vm';

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

// --- 4. the four-session lever is inside the floor -----------------------------------------------------
const targets = fs.readFileSync('app/src/fragments/40-targets.fragment.js', 'utf8');
check('the lean plan names the training-frequency lever', targets.includes('训练频率杠杆'));
check('the lever is computed from a real activity factor', targets.includes('const altFactor = activityFactorFor(4);'));
check('the lever states whether the floor still holds', targets.includes('仍在硬底线'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
