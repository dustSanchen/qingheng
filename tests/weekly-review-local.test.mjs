/**
 * Local weekly review (1.4.73): recent completed Monday–Sunday, honest sample sizing,
 * no AI call, no invented score, no training line for a no-training profile.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing function ' + name);
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
  throw new Error('unterminated function ' + name);
}

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const factory = new Function(
  extractFunction(app, 'completedWeekEnd') + '\n' +
  extractFunction(app, 'buildWeeklyReview') + '\n' +
  'return {completedWeekEnd, buildWeeklyReview};'
);
const {completedWeekEnd, buildWeeklyReview} = factory();

check('a Sunday is the completed week end', completedWeekEnd('2026-11-22') === '2026-11-22', completedWeekEnd('2026-11-22'));
check('a Monday points back to the previous Sunday', completedWeekEnd('2026-11-16') === '2026-11-15', completedWeekEnd('2026-11-16'));
check('a Saturday points back to the previous Sunday', completedWeekEnd('2026-11-21') === '2026-11-15', completedWeekEnd('2026-11-21'));

const day = (weight, patch = {}) => ({date: '2026-11-16', weight, hasMeal: true, calories: 2000, min: 1800, max: 2200, hasExercise: false, hasRecord: true, ...patch});
const current = [
  day(70), day(null), day(70.5), day(null), day(70),
  day(null, {hasMeal: false, calories: null, min: null, max: null}),
  day(null, {hasMeal: false, calories: null, min: null, max: null})
];
const previous = [day(71), day(71), day(70.8), day(null), day(null), day(null), day(null)];
let data = buildWeeklyReview({
  weekStart: '2026-11-16', weekEnd: '2026-11-22',
  currentDays: current, previousDays: previous, trainingEnabled: true
});
check('the completed week is enough when any record exists', data.enough === true);
check('the weight mean uses measured days only', data.weight.currentMean === 70.2, data.weight.currentMean);
check('the previous week mean is compared when both samples exist', data.weight.comparable === true && data.weight.delta === -0.7, JSON.stringify(data.weight));
check('meal days are counted, not assumed', data.mealDays === 5, data.mealDays);
check('target range days are counted separately', data.targetDays === 5 && data.targetKnownDays === 5, `${data.targetDays}/${data.targetKnownDays}`);
check('training counts actual exercise days', data.training && data.training.days === 0, data.training);

const trainingOff = buildWeeklyReview({
  weekStart: '2026-11-16', weekEnd: '2026-11-22',
  currentDays: current, previousDays: previous, trainingEnabled: false
});
check('a no-training profile has no training block', trainingOff.training === null);
check('a no-training profile never gets training advice', !/训练/.test(trainingOff.action), trainingOff.action);

const oneWeight = buildWeeklyReview({
  weekStart: '2026-11-16', weekEnd: '2026-11-22',
  currentDays: [day(70), day(null), day(null), day(null), day(null), day(null), day(null)],
  previousDays: previous, trainingEnabled: true
});
check('one weight measurement cannot claim a trend', oneWeight.weight.comparable === false && oneWeight.weight.delta === null);
check('the action asks for a repeat weighing', oneWeight.action.includes('称重'), oneWeight.action);

const empty = buildWeeklyReview({weekStart: '2026-11-16', weekEnd: '2026-11-22', currentDays: [], previousDays: [], trainingEnabled: true});
check('an empty week has no invented score', empty.enough === false && empty.weight.currentMean === null);
check('an empty week gives one honest next step', empty.action.includes('先记两天'), empty.action);

const mealOnly = buildWeeklyReview({
  weekStart: '2026-11-16', weekEnd: '2026-11-22',
  currentDays: [day(null, {hasMeal: true, hasExercise: false}), day(null, {hasMeal: true}), day(null, {hasMeal: true}), day(null, {hasMeal: false}), day(null, {hasMeal: false}), day(null, {hasMeal: false}), day(null, {hasMeal: false})],
  previousDays: [], trainingEnabled: true
});
check('meal-only data still has a useful review', mealOnly.enough === true && mealOnly.mealDays === 3);
check('the local action is not a diagnosis', !/诊断|处方|疾病|节食/.test(mealOnly.action), mealOnly.action);

check('the trends page owns the weekly card', html.includes('id="weekly-review-card"') && html.includes('id="weekly-review-body"') && html.includes('id="weekly-review-range"'));
check('the card is placed in the weight panel', app.includes("headings: ['体重变化', '上周回看', '身体成分对照', '身体记录明细']"));
check('trends renders the review every time', app.includes('renderWeeklyReview();') && app.includes('function renderWeeklyReview()'));
check('the review is local and never calls a provider', !/renderWeeklyReview[\s\S]{0,1500}api\(/.test(app));
check('the card has a bounded metric grid', css.includes('.weekly-review-grid') && css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
check('the empty state is honest', app.includes('这一周记录不足，暂时不能比较。'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
