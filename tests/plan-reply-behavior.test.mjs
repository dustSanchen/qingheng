/**
 * 排课链路的行为测试（2026-11-19，1.4.46 起）。
 *
 * 为什么不用字符串断言：重量全空的 bug 是在 76 个「grep 式」用例全绿的情况下发出去的。
 * 这里把真实模型回复存成 fixture（tests/fixtures/plan-reply-1.4.44.json），
 * 从片段里切出真实函数跑全链路：解析 → 缺重量兜底 → 渐进 → 强度降载 → 本地记忆。
 */
import fs from 'node:fs';
import vm from 'node:vm';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const readSrc = path => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const rest = readSrc('app/src/fragments/70-rest.fragment.js');
const training = readSrc('app/src/fragments/60-training-copy.fragment.js');
const onboarding = readSrc('app/src/fragments/50-onboarding.fragment.js');

/** 取 [startMarker, endMarker) 之间的一段源码；两端标记必须存在，否则直接崩，避免静默截空。 */
function sliceBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`${label} slice markers not found`);
  return source.slice(start, end);
}

const pieces = [
  // 自重判定（50）
  sliceBetween(onboarding, '  const BODYWEIGHT_MOVES = ', '  /**\n   * 复合动作', 'bodyweight moves'),
  // 可装重量 + 重量记忆 + 渐进（60）
  sliceBetween(training, '  function loadableWeightKg(name, desired) {', '  /**\n   * 七天训练安排从', 'loadable weights'),
  sliceBetween(training, "  const WEIGHT_MEMORY_KEY = 'qingheng.exerciseWeights';", '  const WEEK_PLAN_KEY =', 'weight memory'),
  // 强度信号 + 教练说明（70）
  sliceBetween(rest, '  const EFFORT_LABELS = ', '  function aiPlanDose(item) {', 'effort block'),
  // 补重量 + 逐行转换（70）
  sliceBetween(rest, '  function planWeightFor(row) {', '  /** 流式期间只认已经闭合的', 'plan row'),
  // 解析模型回复（70）
  sliceBetween(rest, '  function parseAiPlanReply(reply) {', '  async function askAiPlan(', 'parse reply'),
  // 本地上下文卡 + 本地校验器（70，1.4.47）
  sliceBetween(rest, '  function compilePlanContext(date) {', '  async function askAiPlan(', 'plan context'),
];

const store = new Map();
const sandbox = {
  state: {profile: {weight: 88, goal: 'lean'}, habits: [], meals: [], measurements: []},
  activeDate: '2026-11-19',
  planPrefs: () => ({days: 4, split: 'full', gear: 'mixed', minutes: 45}),
  GOAL_PRESETS: {lean: {muscleSetsPerWeek: [12, 18], reps: [8, 15], rir: [1, 2]}},
  GOAL_LABEL: {lean: '薄肌（线条）', gain: '增肌'},
  GEAR_LABELS: {mixed: '综合', barbell: '杠铃为主'},
  dayTemplateNote: () => '今天（推）',
  // 与 app 里同口径的粗略时长折算：8 分钟热身 + 每组 45 秒执行 + 90 秒休息。
  planMinutes: plan => Math.round(8 + (plan || []).reduce((sum, item) => sum + (Number(item && item.sets) || 0) * 135 / 60, 0)),
  number: v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)),
  validDate: value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')),
  localDate: () => '2026-11-19',
  shiftDay: (date, offset) => {
    const base = Date.parse(String(date) + 'T00:00:00Z') + offset * 86400000;
    return new Date(base).toISOString().slice(0, 10);
  },
  exercisesFor: date => {
    const row = (sandbox.state.habits || []).find(item => item && item.date === date);
    return row && Array.isArray(row.exercises) ? row.exercises : [];
  },
  localStorage: {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
  },
  Date, Math, Map, Array, String, Number, Object, JSON, parseInt, parseFloat, isNaN, console,
};
vm.createContext(sandbox);
vm.runInContext(pieces.join('\n') + `
this.parseAiPlanReply = parseAiPlanReply;
this.planItemFromRow = planItemFromRow;
this.plannedWeightFor = plannedWeightFor;
this.progressiveWeightKg = progressiveWeightKg;
this.applyEffortSignalToPlan = applyEffortSignalToPlan;
this.effortSignal = effortSignal;
this.rememberPlanWeights = rememberPlanWeights;
this.readWeightMemory = readWeightMemory;
this.compilePlanContext = compilePlanContext;
this.validatePlanAgainstContext = validatePlanAgainstContext;
`, sandbox);

const fixture = JSON.parse(readSrc('tests/fixtures/plan-reply-1.4.44.json'));
const plan = sandbox.parseAiPlanReply(fixture.reply);

// --- 1. 真机样本原样通过 -----------------------------------------------------------------------------------
check('the real reply parses into five moves', plan.length === 5, plan.length);
check('model-provided weights survive', plan[0].weight === 55 && plan[1].weight === 16 && plan[2].weight === 20, plan.map(item => item.weight).join('/'));
check('weights are tagged with their source', plan[0].weightSource === 'model', plan[0].weightSource);
check('bodyweight moves keep no kg', plan[3].weight === null && plan[3].weightSource === 'bodyweight', `${plan[3].weight}/${plan[3].weightSource}`);

// --- 2. 模拟故障：模型整份回复都不给重量（这就是用户报的 bug） ----------------------------------------------
const stripped = JSON.stringify(JSON.parse(fixture.reply).map(row => ({...row, weight: undefined})));
sandbox.state.habits = [{date: '2026-11-18', exercises: [{name: '杠铃卧推', sets: 3, reps: 8, weight: 50}]}];
sandbox.activeDate = '2026-11-19';
const rescued = sandbox.parseAiPlanReply(stripped);
check('every loaded move still gets a weight when the model drops them', rescued.slice(0, 3).every(item => item.weight > 0), rescued.slice(0, 3).map(item => item.name + ' ' + item.weight).join(' / '));
check('a recorded lift progresses from its own history', rescued[0].weight === 55 && rescued[0].weightSource === 'log', `${rescued[0].weight}/${rescued[0].weightSource}`);
check('an unrecorded dumbbell move falls back to the bodyweight ratio', rescued[1].weight > 0 && rescued[1].weightSource !== 'model', `${rescued[1].weight}/${rescued[1].weightSource}`);
check('bodyweight moves stay empty even in the fallback', rescued[3].weight === null, rescued[3].weight);

// --- 3. 渐进规则：上限与退档 ------------------------------------------------------------------------------
sandbox.rememberPlanWeights(rescued);
const memory = sandbox.readWeightMemory();
check('rescued weights are remembered locally', Object.keys(memory).length >= 3, Object.keys(memory).length);
const capped = sandbox.progressiveWeightKg('杠铃卧推', {weight: 50, reps: 10, date: '2026-11-18'});
// 杠铃只能按整 5 kg 走：50 加一档 = 52.5 装不出来，落到 55（仍在 +10% 上限内）。
check('a strong set adds one step, rounded to a loadable bar', capped === 55, capped);
const held = sandbox.progressiveWeightKg('杠铃卧推', {weight: 50, reps: 6, date: '2026-11-18'});
check('six reps hold the weight', held === 50, held);
const backedOff = sandbox.progressiveWeightKg('杠铃卧推', {weight: 50, reps: 4, date: '2026-11-18'});
check('four reps back off a step', backedOff === 45, backedOff);
const stale = sandbox.progressiveWeightKg('杠铃卧推', {weight: 50, reps: 10, date: '2026-08-01'});
check('a long layoff does not add weight', stale <= 50, stale);

// --- 4. 强度反馈真的改变清单 ------------------------------------------------------------------------------
sandbox.state.habits = [
  {date: '2026-11-19', exercises: [{name: '杠铃卧推', sets: 3, reps: 8, weight: 50}], effort: 'tooMuch'},
];
sandbox.activeDate = '2026-11-19';
const deloadSignal = sandbox.effortSignal();
check('one "tooMuch" is enough to call a deload', deloadSignal.level === 'deload', deloadSignal.level);
const deloaded = sandbox.applyEffortSignalToPlan(JSON.parse(JSON.stringify(plan)));
check('deload trims a set but never below one', deloaded[0].sets === 2 && deloaded[4].sets === 1 && deloaded[1].sets === 1, deloaded.map(item => item.sets).join('/'));
check('deload backs the weight off and actually lands lower', deloaded[0].weight === 50 && deloaded[1].weight === 14, `${deloaded[0].weight}/${deloaded[1].weight}`);

sandbox.state.habits = [
  {date: '2026-11-18', exercises: [{name: '杠铃卧推', sets: 3, reps: 8, weight: 50}], effort: 'tooLight'},
  {date: '2026-11-17', exercises: [{name: '杠铃卧推', sets: 3, reps: 8, weight: 50}], effort: 'tooLight'},
];
sandbox.activeDate = '2026-11-19';
check('two light sessions call a push', sandbox.effortSignal().level === 'push', sandbox.effortSignal().level);
const pushed = sandbox.applyEffortSignalToPlan(JSON.parse(JSON.stringify(plan)));
check('push adds a set to the first loaded move', pushed[0].sets === 4, pushed[0].sets);

sandbox.state.habits = [{date: '2026-11-18', exercises: [], effort: 'justRight'}];
check('a single "justRight" changes nothing', sandbox.effortSignal().level === 'keep' && sandbox.applyEffortSignalToPlan(plan) === plan, sandbox.effortSignal().level);

// --- 5. 本地上下文卡与校验器（1.4.47）---------------------------------------------------------------------
sandbox.state.habits = [{date: '2026-11-18', exercises: [{name: '杠铃卧推', sets: 3, reps: 8, weight: 50}]}];
const context = sandbox.compilePlanContext('2026-11-19');
check('the context card names the body part', context.text.includes('部位') && context.text.includes('推'), context.text.split('\n')[1]);
check('it carries the per-muscle set range from the local preset', context.text.includes('每部位组数：12~18 组'), context.text.split('\n')[3]);
check('it carries the time budget', context.text.includes('时长：45 分钟'), context.text.split('\n')[2]);
check('it carries only same-part baselines', context.baselines.length >= 1 && context.baselines.length <= 3
  && context.baselines.every(name => /卧推|推肩|飞鸟|下压|臂屈伸|侧平举/.test(name))
  && context.text.includes('杠铃卧推 3x8 50kg'), context.baselines.join(';'));
check('the whole card stays short enough for a prompt', context.text.length <= 700, context.text.length);

const draft = [
  {name: '杠铃卧推', sets: 7, reps: 8, weight: 62.5},
  {name: '上斜哑铃卧推', sets: 5, reps: 10, weight: 16},
  {name: '双杠臂屈伸', sets: 5, reps: 8, bodyweight: true},
  {name: '蝴蝶机夹胸', sets: 4, reps: 12, weight: 25},
  {name: '绳索下压', sets: 4, reps: 12, weight: 25}
];
const validated = sandbox.validatePlanAgainstContext(JSON.parse(JSON.stringify(draft)), context);
check('unloadable weights are snapped by the local validator', validated[0].weight === 65, validated[0].weight);
check('sets are capped at five', validated.every(item => Number(item.sets) <= 5), validated.map(item => item.sets).join('/'));
check('an over-long plan is trimmed to the time budget', sandbox.planMinutes(validated) <= context.minutes + 3, sandbox.planMinutes(validated));
check('the first move is never emptied', validated[0].sets >= 1, validated[0].sets);
check('bodyweight moves keep their sets untouched by weights', validated[2].weight === undefined || validated[2].weight === null, validated[2].weight);

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
