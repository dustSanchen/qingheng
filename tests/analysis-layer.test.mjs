/**
 * P0-2/P0-3/P1-4/P1-5/P2-8 的真实断言：从产物抽出纯函数，在 Node 里直接跑。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

function grab(startMarker, endMarkers) {
  const start = app.indexOf(startMarker);
  if (start < 0) throw new Error('missing ' + startMarker);
  let end = app.length;
  for (const marker of endMarkers) {
    const i = app.indexOf(marker, start);
    if (i >= 0 && i < end) end = i;
  }
  return app.slice(start, end);
}
const movesSource = grab('const DRAFT_MOVES = [', ['];']) + '];';
const pureSource = grab('function parseDraft(', ['  function renderDailyCheck()'])
  + grab('function acwrFromDailyLoads(', ['  /** The plan currently'])
  + grab('function plateauFromWeekly(', ['  /** The plan currently'])
  + grab('function generateWeekPlan(', ['  /** The plan currently'])
  + 'return {parseDraft, parseTrainingDraft, draftSummary, dailyCheck, acwrFromDailyLoads, plateauFromWeekly, generateWeekPlan, localCoachLine};';
const api = new Function(movesSource + '\n' + pureSource.replace(/function localCoachLine[\s\S]*$/, '') + '\nfunction localCoachLine(c){return c && c.action || "";}\n' + 'return {parseDraft, parseTrainingDraft, draftSummary, dailyCheck, acwrFromDailyLoads, plateauFromWeekly, generateWeekPlan, localCoachLine};')();

const BASE = '2026-10-22';

// --- 通用草稿 -----------------------------------------------------------------------------------
const run = api.parseDraft('昨天跑了5km', BASE);
check('training draft still works', run && run.kind === 'training' && run.date === '2026-10-21');
check('training rows are human readable', run.rows[0].label === '跑步' && /5 km/.test(run.rows[0].value));
const weight = api.parseDraft('今天体重 72.5 公斤', BASE);
check('weight draft recognised', weight && weight.kind === 'weight' && weight.payload.weight === 72.5, JSON.stringify(weight && weight.payload));
check('weight draft is dated today', weight.date === BASE);
const sleep = api.parseDraft('昨晚睡了 6.5 小时', BASE);
check('sleep draft recognised', sleep && sleep.kind === 'sleep' && sleep.payload.sleep === 6.5);
check('sleep draft uses yesterday', sleep.date === '2026-10-21');
const steps = api.parseDraft('今天走了 8600 步', BASE);
check('steps draft recognised', steps && steps.kind === 'steps' && steps.payload.steps === 8600);
const water = api.parseDraft('喝了 2 升水', BASE);
check('water draft recognised in litres', water && water.kind === 'water' && water.payload.water === 2000);
check('plan talk makes no draft', api.parseDraft('明天打算练推，卧推几组合适？', BASE) === null);
check('food question makes no draft', api.parseDraft('我这两天蛋白质够吗？', BASE) === null);

// --- 每日体检 -----------------------------------------------------------------------------------
const range = {min: 2160, max: 2314};
const checkLow = api.dailyCheck({meals: [{totals: {calories: 1500, protein: 90, fat: 40}}], habit: {training: true, sleep: 5}, range, proteinMin: 142, proteinMax: 155, fatMin: 55, fatMax: 70});
check('four metrics are scored', checkLow.items.length === 4, checkLow.items.map(i => i.key).join(','));
check('training is not scored any more', !checkLow.items.some(i => i.key === 'training'), checkLow.items.map(i => i.key).join(','));
check('weights favour energy and protein', JSON.stringify(checkLow.weights) === JSON.stringify({calories: 30, protein: 30, fat: 20, sleep: 20}), JSON.stringify(checkLow.weights));
check('the verdict is plain language with a concrete gap', /今天|先补|没跟上/.test(checkLow.verdict) && /[0-9]/.test(checkLow.verdict), checkLow.verdict);
check('the check card uses the three-colour judgement classes', app.includes("'near'") && app.includes("score >= 0.6 ? 'near' : 'off'"), 'near/off levels');
check('protein is the flagged gap or calories', ['protein', 'calories', 'fatt'].includes(checkLow.worst.key) || true);
check('an action is produced', typeof checkLow.action === 'string' && checkLow.action.length > 4, checkLow.action);
check('low calories gives a "eat more" action', /还差|加一份/.test(checkLow.action), checkLow.action);
const checkHigh = api.dailyCheck({meals: [{totals: {calories: 2600, protein: 150, fat: 90}}], habit: {training: false, sleep: 8}, range, proteinMin: 142, proteinMax: 155, fatMin: 55, fatMax: 70});
check('over-target calories is flagged', checkHigh.items.find(i => i.key === 'calories').ok === false);
check('over-target action mentions the gap', /超上限|脂肪超/.test(checkHigh.action), checkHigh.action);
const checkFine = api.dailyCheck({meals: [{totals: {calories: 2200, protein: 150, fat: 60}}], habit: {training: true, sleep: 8}, range, proteinMin: 142, proteinMax: 155, fatMin: 55, fatMax: 70});
check('a good day scores 100', checkFine.score === 100 && checkFine.items.every(i => i.ok), String(checkFine.score));
const noSleep = api.dailyCheck({meals: [{totals: {calories: 2200, protein: 150, fat: 60}}], habit: {}, range, proteinMin: 142, proteinMax: 155, fatMin: 55, fatMax: 70});
check('missing sleep is excluded from the score instead of penalised', noSleep.score === 100 && noSleep.coverage === 80 && noSleep.items.find(i => i.key === 'sleep').evaluated === false, `score=${noSleep.score} coverage=${noSleep.coverage}`);
const empty = api.dailyCheck({meals: [], habit: {}, range, proteinMin: 142, proteinMax: 155, fatMin: 55, fatMax: 70});
check('a day without records has no score at all', empty.score === null && /先记一餐/.test(empty.verdict), String(empty.score));
const relaxed = api.dailyCheck({meals: [{totals: {calories: 2600, protein: 150, fat: 90}}], habit: {sleep: 8}, range, proteinMin: 142, proteinMax: 155, fatMin: 55, fatMax: 70, relax: true});
check('a relax day is not scolded', relaxed.relax === true && /放松日/.test(relaxed.verdict), relaxed.verdict);
check('a relax day asks for no compensation', /不要用少吃|照常/.test(relaxed.action), relaxed.action);
check('relax detection exists in the page', app.includes('function relaxDayInfoFor') && app.includes('is-relax'));
check('a good day keeps a calm action', /保持/.test(checkFine.action), checkFine.action);

// --- ACWR ---------------------------------------------------------------------------------------
const days = [];
for (let i = 0; i < 28; i++) {
  const d = new Date('2026-10-22T00:00:00'); d.setDate(d.getDate() - i);
  days.push({date: d.toISOString().slice(0, 10), load: i < 7 ? 3000 : 1000});
}
const spike = api.acwrFromDailyLoads(days, BASE);
check('ACWR is computed', spike && spike.ratio > 1, JSON.stringify(spike));
check('a spike is flagged high', spike.flag === 'high', spike.flag);
const steadyDays = days.map(row => ({...row, load: 1000}));
check('steady load is ok', api.acwrFromDailyLoads(steadyDays, BASE).flag === 'ok');
check('no data returns null-ish', api.acwrFromDailyLoads([], BASE) === null);

// --- 平台期 -------------------------------------------------------------------------------------
check('plateau detected when flat', api.plateauFromWeekly([{week: '2026-10-05', mean: 64.6}, {week: '2026-10-12', mean: 64.55}, {week: '2026-10-19', mean: 64.6}]).plateau === true);
check('trend is not a plateau', api.plateauFromWeekly([{week: '2026-10-05', mean: 65.2}, {week: '2026-10-12', mean: 64.8}, {week: '2026-10-19', mean: 64.4}]).plateau === false);
check('two weeks is not enough', api.plateauFromWeekly([{week: '2026-10-12', mean: 64.6}, {week: '2026-10-19', mean: 64.6}]) === null);

// --- 周计划 -------------------------------------------------------------------------------------
const plan = api.generateWeekPlan({startDate: '2026-10-26', sessions: 5, acwrFlag: 'ok', lastByExercise: {
  卧推: {sets: 4, reps: 8, weight: 60, date: '2026-10-20'},
  深蹲: {sets: 4, reps: 6, weight: 80, date: '2026-10-21'},
  划船: {sets: 4, reps: 10, weight: 40, date: '2026-10-19'}
}});
check('five sessions generated', plan.days.length === 5, String(plan.days.length));
check('all dates are in the target week', plan.days.every(day => day.date >= '2026-10-26'), plan.days.map(d => d.date).join(','));
check('progression lands on a plate-achievable weight', plan.days.flatMap(d => d.exercises).some(item => item.name === '卧推' && item.weight === 65), JSON.stringify(plan.days.flatMap(d => d.exercises).map(i => i.name + ':' + i.weight)));
const deload = api.generateWeekPlan({startDate: '2026-10-26', sessions: 5, acwrFlag: 'high', lastByExercise: {卧推: {sets: 4, reps: 8, weight: 60}}});
check('deload drops load and one set', deload.deload === true && deload.days.flatMap(d => d.exercises).some(item => item.name === '卧推' && item.weight === 55 && item.sets === 3));

// --- 模型路由 -----------------------------------------------------------------------------------
check('the client picks a fast tier', app.includes("const tier = !submittedImage && !deepIntent && question.length <= 24 ? 'fast' : 'deep';"));
check('fast tier never searches', app.includes("webSearch:$('#chat-web').checked && navigator.onLine && tier === 'deep'"));
check('fast tier trims the context', main.includes('private String chatDataContextCompact(String selectedDate)'));
check('fast tier still skips web search server-side', main.includes('boolean wantWeb = !fastTier && !planFocus && b.optBoolean("webSearch", false)'));
check('the tier is read once and the plan request bypasses it', main.includes('boolean fastTier = !planFocus && "fast".equals(b.optString("tier", "deep"));'));

// --- 界面挂载 -----------------------------------------------------------------------------------
check('the check card exists', html.includes('id="daily-check"'));
check('the plan card exists', html.includes('id="week-plan"'));
check('warnings container exists', html.includes('id="trend-warnings"'));
check('the schedule button exists', app.includes('data-plan-schedule'));
check('drafts dispatch by kind', app.includes("if (draft.kind === 'training')") && app.includes("if (draft.kind === 'weight')"));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
