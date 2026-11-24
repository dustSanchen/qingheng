/**
 * 模块化契约：训练模块挂牌入驻 QH.training 之后的对外接口与事件联动。
 *
 * 这一组不做字符串断言：真的把 05 基座（window.QH）+ 55 领域层 + 68 的注册块拼进 vm 跑，
 * 用一份金字塔组（10×40 / 8×60 / 5×80）+ 一条旧格式记录当样本，验证三个查询口径与 ACWR 直接可用。
 */
import fs from 'node:fs';
import vm from 'node:vm';
import {functionSource} from './lib/extract.mjs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const read = path => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const core = read('app/src/fragments/05-core-runtime.fragment.js');
const domain = read('app/src/fragments/55-training-domain.fragment.js');
const log = read('app/src/fragments/68-training-log.fragment.js');
const copy = read('app/src/fragments/60-training-copy.fragment.js');

// 样本：今天一条金字塔组 + 一条自重 + 一条有氧；上周四一条旧格式（只有 sets/reps/weight）。
const store = new Map();
const sandbox = {
  window: {}, console, Date, Math, JSON, Number, Object, Array, String, Boolean, Set, Map,
  parseInt, parseFloat, isNaN, Promise, ArrayBuffer,
  localStorage: {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key)
  },
  state: {
    profile: {}, settings: {},
    habits: [
      {date: '2026-11-19', template: 'push', exercises: [
        {name: '卧推', setDetails: [{reps: 10, weight: 40}, {reps: 8, weight: 60}, {reps: 5, weight: 80}]},
        {name: '引体向上', setDetails: [{reps: 8}, {reps: 7}]},
        {name: '跑步', distanceKm: 3, durationMin: 20}
      ]},
      {date: '2026-11-17', exercises: [{name: '深蹲', sets: 3, reps: 5, weight: 100}]}
    ]
  },
  activeDate: '2026-11-19',
  number: value => (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null),
  validDate: value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(`${value}T00:00:00Z`)),
  localDate: () => '2026-11-19',
  shiftDay: (value, days) => {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },
  fmt: (value, digits = 1) => String(Number(value).toFixed(digits))
};
vm.createContext(sandbox);
vm.runInContext(core, sandbox, {filename: '05-core-runtime.fragment.js'});
vm.runInContext(domain, sandbox, {filename: '55-training-domain.fragment.js'});
vm.runInContext(functionSource(copy, 'weekdayIndex'), sandbox, {filename: 'weekdayIndex'});
vm.runInContext(functionSource(log, 'weekTrainingStats'), sandbox, {filename: 'weekTrainingStats'});

const blockAt = log.indexOf("QH.define('training'");
check('the training contract block exists', blockAt > 0, String(blockAt));
if (blockAt > 0) vm.runInContext(log.slice(blockAt), sandbox, {filename: "QH.define('training')"});

const QH = sandbox.window.QH || {};
const training = QH.training;

check('QH.training registers itself under the namespace',
  !!training && QH.require('training') === training && QH.list().includes('training'), Object.keys(QH._modules || {}).join(','));
check('the public API is exactly the three read-only queries',
  !!training && Object.keys(training).sort().join(',') === 'getDailyLoads,getTodaySummary,getWeekStats', training && Object.keys(training).sort().join(','));
check('the module is recorded as a frozen contract',
  !!training && Object.isFrozen(training) && QH._modules.training.methods.length === 3 && Object.isFrozen(QH._modules.training));
check('the contract never exposes a mutable object', (() => {
  try { QH.define('probe', {payload: {}}); return false; } catch { return true; }
})());

// --- getTodaySummary：逐组容量 + 顶组摘要 -------------------------------------------------------
const today = training && training.getTodaySummary();
check('today reports the saved session', !!today && today.date === '2026-11-19' && today.trained === true && today.template === 'push', JSON.stringify(today));
check('volume uses per-set detail (10×40 + 8×60 + 5×80 = 1280)', !!today && today.volume === 1280, today && today.volume);
check('sets and bodyweight reps are counted separately', !!today && today.sets === 5 && today.bodyweightReps === 15, today && `${today.sets}/${today.bodyweightReps}`);
check('cardio distance and minutes ride along', !!today && today.distanceKm === 3 && today.durationMin === 20, today && `${today.distanceKm}/${today.durationMin}`);
check('the top set is the heaviest set, not the first', !!today && today.topSet && today.topSet.name === '卧推' && today.topSet.weight === 80 && today.topSet.reps === 5 && today.topSet.sets === 3, JSON.stringify(today && today.topSet));
check('an empty day reports nothing trained', (() => {
  const empty = training.getTodaySummary('2026-11-15');
  return empty.trained === false && empty.volume === 0 && empty.exercises === 0 && empty.topSet === null;
})(), JSON.stringify(training && training.getTodaySummary('2026-11-15')));
check('an old record without setDetails still reports its volume', (() => {
  const old = training.getTodaySummary('2026-11-17');
  return old.volume === 1500 && old.sets === 3 && old.topSet.weight === 100;
})(), JSON.stringify(training && training.getTodaySummary('2026-11-17')));
check('a bad date falls back to the active date', !!training && training.getTodaySummary('nope').date === '2026-11-19');

// --- getWeekStats --------------------------------------------------------------------------------
const week = training && training.getWeekStats();
check('the week starts on Monday', !!week && week.weekStart === '2026-11-16', week && week.weekStart);
check('the week counts sessions and volume', !!week && week.sessions === 2 && week.totalVolume === 2780, week && `${week.sessions}/${week.totalVolume}`);
check('the week keeps cardio and bodyweight separate', !!week && week.totalKm === 3 && week.totalMin === 20 && week.totalBwReps === 15, week && `${week.totalKm}/${week.totalMin}/${week.totalBwReps}`);

// --- getDailyLoads：逐组口径，可直接喂 ACWR ------------------------------------------------------
const loads = training && training.getDailyLoads();
check('daily loads default to 28 days and end today', Array.isArray(loads) && loads.length === 28 && loads[0].date === '2026-11-19', loads && loads.length);
check('a pyramid day loads per set (1280 + 20min×6 = 1400)', !!loads && loads[0].load === 1400, loads && loads[0].load);
check('an old record keeps its fallback volume', !!loads && loads[2].load === 1500, loads && loads[2].load);
check('an empty day loads zero', !!loads && loads[1].load === 0);
check('the ask is clamped to a sane window', !!training && training.getDailyLoads(1).length === 1 && training.getDailyLoads(999).length === 180 && training.getDailyLoads(0).length === 1);
check('the array feeds the ACWR calculation directly', (() => {
  const stats = sandbox.acwrFromDailyLoads(training.getDailyLoads(28), '2026-11-19');
  // 7 天窗口里两天有训练：今天 1400 + 上周四 1500 = 2900；慢性负荷按 28 天总量 / 4。
  return !!stats && typeof stats.flag === 'string' && stats.acute === 2900 && stats.chronic === 725;
})(), JSON.stringify(training && sandbox.acwrFromDailyLoads(training.getDailyLoads(28), '2026-11-19')));

// --- 事件联动：保存成功并刷新界面之后才广播 -------------------------------------------------------
const saveBlock = log.slice(log.indexOf('async function saveTrainingLog'), log.indexOf('function renderVolumeTable'));
const emitAt = saveBlock.indexOf('QH.bus.emit(QH.EVENTS.TRAINING_SAVED');
check('saveTrainingLog broadcasts TRAINING_SAVED', emitAt > 0);
check('the broadcast carries the saved date', emitAt > 0 && saveBlock.slice(emitAt, emitAt + 80).includes('{date: activeDate}'));
check('the broadcast runs after the write and the UI refresh',
  emitAt > saveBlock.indexOf('setDraftState(') && emitAt > saveBlock.indexOf('await loadState({quiet: true})'),
  emitAt + ' / ' + saveBlock.indexOf('setDraftState('));
check('the broadcast stays inside the success path',
  emitAt < saveBlock.indexOf('} catch (error) {feedback(message, error.message, true);}'),
  saveBlock.indexOf('} catch (error) {feedback(message, error.message, true);}'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
