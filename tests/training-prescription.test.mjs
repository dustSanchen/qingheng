/**
 * 38 号 §7 的六条验收：不再只做字符串匹配，而是把 generateWeekPlan 抽到 vm 沙箱里
 * 用真实入参跑一遍，对输出断言。依赖用桩代替（plannedWeightFor / planWhy），
 * 因为它们各自的正确性由别的测试负责，这里只验「生成器怎么用它们」。
 */
import fs from 'node:fs';
import vm from 'node:vm';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const libText = fs.readFileSync('app/src/main/assets/training-principles.js', 'utf8');
const number = v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

const slice = (from, to) => {
  const i = app.indexOf(from);
  if (i < 0) throw new Error('missing ' + from);
  const j = to ? app.indexOf(to, i) : -1;
  return j > i ? app.slice(i, j) : app.slice(i);
};

// generateWeekPlan 本体：从函数签名到下一个顶格两空格的右括号
function bodyOf(signature) {
  const start = app.indexOf(signature);
  if (start < 0) throw new Error('missing ' + signature);
  const end = app.indexOf('\n  }\n', start);
  return app.slice(start, end + 5);
}

const sandbox = {
  number,
  console,
  window: {},
  state: {habits: [
    {date: '2026-11-21', template: 'push', exercises: [{name: '杠铃卧推', sets: 4, reps: 8, weight: 60}]},
    {date: '2026-11-19', template: 'pull', exercises: [{name: '杠铃划船', sets: 4, reps: 8, weight: 50}]}
  ]},
  activeDate: '2026-11-23',
  validDate: value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')),
  plannedWeightFor: name => /(杠铃|哑铃|器械|绳索)/.test(name) ? {weight: 20, source: 'inferred'} : {weight: null, source: 'none'},
  planWhy: () => [],
};
vm.createContext(sandbox);
vm.runInContext(libText + '\n;globalThis.__lib = window.TRAINING_PRINCIPLES;', sandbox);

const prelude = [
  slice('const TARGET_RULES = {', '\n  const GOAL_LABEL'),
  slice('const BODYWEIGHT_MOVES', 'function trainingStatsOf('),
  slice('function loadableWeightKg(', 'function generateWeekPlan('),
  slice('function trainingLibrary()', 'function planWhy('),
  bodyOf('function generateWeekPlan(input) {'),
  bodyOf('function nextStartTemplate(split) {'),
  ';globalThis.__gen = generateWeekPlan; globalThis.__next = nextStartTemplate; globalThis.__presets = GOAL_PRESETS;'
].join('\n');
vm.runInContext(prelude, sandbox);

const gen = sandbox.__gen;
const nextStart = sandbox.__next;
const presets = sandbox.__presets;
check('the generator is callable in a sandbox', typeof gen === 'function' && typeof presets === 'object');

const lastByExercise = {
  '杠铃卧推': {sets: 4, reps: 8, weight: 60},
  '杠铃划船': {sets: 4, reps: 8, weight: 50},
  '深蹲': {sets: 4, reps: 6, weight: 80},
  '引体向上': {sets: 4, reps: 8, weight: null}
};
const base = {startDate: '2026-11-23', sessions: 4, goal: 'gain', acwrFlag: 'ok', lastByExercise};
const run = extra => gen({...base, ...extra});

// --- §7-1 结构：每套模板都有主复合 + 次复合 + 孤立（或核心），且器械偏好生效 -------------------
// ppl 的每一天只有一个大部位，所以只允许 1 个主复合；上下肢日由「推 1 + 拉 1」组成，主复合数是 2。
for (const [split, template, mains] of [['ppl', 'push', 1], ['ul', 'upper', 2], ['fb', 'full', 1]]) {
  const plan = run({split, gear: 'mixed', minutes: 45});
  const day = plan.days.find(row => row.template === template);
  const roles = day ? day.exercises.map(item => item.role) : [];
  check(`§7-1 ${split}/${template} 有 ${mains} 个主复合`, roles.filter(role => role === 'main').length === mains, JSON.stringify(roles));
  check(`§7-1 ${split}/${template} 至少 3 个动作`, day && day.exercises.length >= 3, day && String(day.exercises.length));
  check(`§7-1 ${split}/${template} 至少 1 个次复合`, roles.filter(role => role === 'compound').length >= 1, JSON.stringify(roles));
}
// 推拉腿的单部位日必须带孤立动作；上下肢/全身可能被周组数削到只剩主+次复合（允许）。
for (const template of ['push', 'pull', 'legs']) {
  const day = run({split: 'ppl', gear: 'mixed', minutes: 45}).days.find(row => row.template === template);
  check(`§7-1 ppl/${template} 带孤立动作`, day && day.exercises.some(item => item.role === 'isolate'), day && JSON.stringify(day.exercises.map(item => item.role)));
}
const barbell = run({split: 'ppl', gear: 'barbell', minutes: 45});
const pushDay = barbell.days.find(row => row.template === 'push');
check('§7-1 器械偏好为杠铃时主复合是杠铃动作', pushDay && pushDay.exercises[0].gear === 'barbell', pushDay && pushDay.exercises[0].name);

// --- §7-2 重量：非自重必须有数（真实或推算），自重必须留空 --------------------------------------
const mixed = run({split: 'ppl', gear: 'mixed', minutes: 45});
const allExercises = mixed.days.flatMap(day => day.exercises);
const bodyweightMoves = allExercises.filter(item => item.bodyweight);
const weighted = allExercises.filter(item => !item.bodyweight);
check('§7-2 非自重动作都带重量', weighted.length > 0 && weighted.every(item => Number(item.weight) > 0), JSON.stringify(weighted.map(item => item.name + ':' + item.weight)));
check('§7-2 自重动作重量留空', bodyweightMoves.every(item => item.weight === null), String(bodyweightMoves.length));
const approxMoves = allExercises.filter(item => item.weightApprox);
check('§7-2 推算出来的重量带 weightApprox 标记', approxMoves.every(item => item.weightApprox === true && Number(item.weight) > 0), String(approxMoves.length));

// --- §7-3 总组数不超过时长预算 ---------------------------------------------------------------
for (const minutes of [30, 45, 60, 75]) {
  const plan = run({minutes});
  const budget = Math.round(minutes / 3.5);
  const overs = plan.days.filter(day => day.exercises.reduce((sum, item) => sum + item.sets, 0) > Math.max(budget, 8));
  check(`§7-3 ${minutes} 分钟的单次总组数不超 ${budget}`, overs.length === 0,
    plan.days.map(day => day.exercises.reduce((sum, item) => sum + item.sets, 0)).join('/'));
}

// --- §7-4 周组数落进目标区间（不超上限） -----------------------------------------------------
const familyOf = name => /(深蹲|硬拉|腿举|提踵|臀|保加利亚|分腿蹲)/.test(name) ? 'legs'
  : /(引体|划船|下拉|弯举|面拉|直臂)/.test(name) ? 'pull'
    : /(卧推|肩推|侧平举|下压|臂屈伸|飞鸟)/.test(name) ? 'push' : 'other';
const weekly = {push: 0, pull: 0, legs: 0};
for (const day of mixed.days) for (const item of day.exercises) weekly[familyOf(item.name)] += item.sets;
const cap = presets.gain.muscleSetsPerWeek[1];
check('§7-4 每个部位的周组数不超目标上限', weekly.push <= cap && weekly.pull <= cap && weekly.legs <= cap,
  JSON.stringify(weekly) + ' cap=' + cap);

// --- §7-5 起始部位接上一次训练的下一个 -------------------------------------------------------
check('§7-5 上次是推 → 这次先拉', nextStart('ppl') === 'pull', nextStart('ppl'));
sandbox.state.habits = [{date: '2026-11-22', template: 'legs', exercises: [{name: '深蹲', sets: 3}]}];
check('§7-5 上次是腿 → 这次先推', nextStart('ppl') === 'push', nextStart('ppl'));
check('§7-5 上下肢：上次是腿 → 先上肢', nextStart('ul') === 'upper', nextStart('ul'));
check('§7-5 全身固定 full', nextStart('fb') === 'full', nextStart('fb'));

// --- §7-6 次数与 RIR 必须落在 GOAL_PRESETS 的区间 -------------------------------------------
for (const goal of ['gain', 'cut', 'maintain', 'lean']) {
  const plan = run({goal});
  const range = presets[goal].reps;
  const rir = presets[goal].rir;
  const rows = plan.days.flatMap(day => day.exercises);
  const repsOk = rows.every(item => item.reps >= range[0] && item.reps <= range[1] + 2);
  const rirOk = rows.every(item => item.rir >= rir[0] && item.rir <= rir[1]);
  check(`§7-6 ${goal} 的次数落在 ${range[0]}~${range[1]}（自重可 +1）`, repsOk, [...new Set(rows.map(item => item.reps))].join(','));
  check(`§7-6 ${goal} 的 RIR 落在 ${rir[0]}~${rir[1]}`, rirOk, [...new Set(rows.map(item => item.rir))].join(','));
}

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
