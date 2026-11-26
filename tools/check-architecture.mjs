/**
 * 架构边境守卫（Architecture border guard）。
 *
 * 为什么要有它：片段拼成一个大 IIFE 之后，任何一片都能直接摸到别人的 DOM、state 和 localStorage 键，
 * 越界不会立刻报错，只会在几轮之后变成「改了 A 页 B 页跟着坏」。这里把三条边界做成可执行的断言：
 *
 *   1. 构建秩序  片段编号必须落在分层带宽内（00-09 基座 … 90-99 趋势与设置），且 app.js 与片段一致；
 *   2. 领域层纯净 `*-domain.fragment.js` 是纯计算层，出现任何 DOM 操作直接 exit 1；
 *   3. 总线可用   05-core-runtime 必须紧跟 00-head 合入 app.js，且 QH.define / QH.bus / QH.select
 *                在没有 DOM 的 vm 里能真正跑起来（不是「文件里出现过这个词」就算数）。
 *
 * 用法：
 *   node tools/check-architecture.mjs                  # 日常体检（存量编号偏差记 WARN）
 *   node tools/check-architecture.mjs --strict-bands   # 迁移用：编号带不合规也算失败
 *
 * 被 tools/test-all.mjs 与 tests/suite-architecture.test.mjs 直接 import 复用，不再重复实现。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath, pathToFileURL} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const FRAGMENT_DIR = path.join(ROOT, 'app', 'src', 'fragments');
const ASSEMBLED = path.join(ROOT, 'app', 'src', 'main', 'assets', 'app.js');
const CORE_FILE = '05-core-runtime.fragment.js';
const HEAD_FILE = '00-head.fragment.js';

/** 分层带宽：编号决定它属于哪一层，层名与关键词用来校验「文件自我声明的位置」。 */
export const BANDS = [
  {from: 0, to: 9, name: '核心基座', hints: ['core', 'runtime', 'head', 'boot', 'state']},
  {from: 10, to: 19, name: '富文本与通用 UI', hints: ['rich', 'ui', 'render', 'text']},
  {from: 20, to: 29, name: '今天页', hints: ['today', 'home', 'dashboard', 'onboarding']},
  {from: 30, to: 39, name: '体重与体态', hints: ['weight', 'body', 'measure', 'shape']},
  {from: 40, to: 49, name: '饮食模块', hints: ['diet', 'meal', 'food', 'intake']},
  {from: 50, to: 69, name: '训练模块', hints: ['training', 'exercise', 'workout', 'session']},
  {from: 70, to: 79, name: '休息与全局辅助', hints: ['rest', 'global', 'motion', 'swipe', 'permission', 'backup', 'skin']},
  {from: 80, to: 89, name: 'AI 问答模块', hints: ['chat', 'voice', 'push', 'answer', 'ai']},
  {from: 90, to: 99, name: '趋势与设置', hints: ['trend', 'setting', 'target', 'usage', 'about', 'profile']}
];

/**
 * 存量偏差：这些片段是分层规范落地前就存在的，编号与语义层不一致。
 * 现在不阻断（否则守卫第一天就全红、没人会用它），但新片段一律按带宽严格校验。
 * 迁移时把对应文件改名，并从这张表里删掉一行；`--strict-bands` 会把这些也当失败。
 */
export const LEGACY_BAND_MISMATCH = {
  '20-permissions-backup.fragment.js': '权限/备份属于 70-79 全局辅助',
  '30-voice.fragment.js': '语音属于 80-89 AI 问答',
  '40-targets.fragment.js': '目标预设属于 90-99 趋势与设置',
  '50-onboarding.fragment.js': '首次引导属于 20-29 今天页',
  '55-usage.fragment.js': '用量统计属于 90-99 趋势与设置',
  '80-boot.fragment.js': '启动装配属于 00-09 核心基座'
};

/** 领域层（纯计算）里一律不许出现的浏览器交互 token。 */
const DOM_TOKENS = [
  ['document.', 'DOM 查询'],
  ['querySelector', 'DOM 查询'],
  ['getElementById', 'DOM 查询'],
  ['getElementsBy', 'DOM 查询'],
  ['innerHTML', 'DOM 写入'],
  ['outerHTML', 'DOM 写入'],
  ['window.alert', '弹窗'],
  ['window.confirm', '弹窗'],
  ['window.prompt', '弹窗']
];

const NAME_PATTERN = /^(\d\d)-[a-z0-9]+(?:-[a-z0-9]+)*\.fragment\.js$/;

function bandOf(prefix) {
  return BANDS.find(band => prefix >= band.from && prefix <= band.to) || null;
}

function naturalCompare(a, b) {
  const left = Number(a.slice(0, 2));
  const right = Number(b.slice(0, 2));
  if (left !== right) return left - right;
  return a < b ? -1 : a > b ? 1 : 0;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/**
 * 跑一次架构体检。
 * @param {{root?: string, strictBands?: boolean, quiet?: boolean}} [options]
 * @returns {{ok: boolean, errors: string[], warnings: string[], checks: number, fragments: string[]}}
 */
export function checkArchitecture(options = {}) {
  const root = options.root ? path.resolve(options.root) : ROOT;
  const strict = !!options.strictBands;
  const quiet = !!options.quiet;
  const fragmentDir = path.join(root, 'app', 'src', 'fragments');
  const assembledPath = path.join(root, 'app', 'src', 'main', 'assets', 'app.js');

  const errors = [];
  const warnings = [];
  let checks = 0;
  let names = [];

  const say = (kind, label, detail) => {
    if (quiet) return;
    const tail = detail === undefined ? '' : '  -> ' + detail;
    console.log(kind.padEnd(4) + '  ' + label + tail);
  };
  const pass = label => { checks += 1; say('PASS', label); };
  const warn = (label, detail) => { checks += 1; warnings.push(label + (detail ? ' (' + detail + ')' : '')); say('WARN', label, detail); };
  const fail = (label, detail) => { checks += 1; errors.push(label + (detail ? ' (' + detail + ')' : '')); say('FAIL', label, detail); };

  // ---- 0. 目录与文件清单 -----------------------------------------------------------------------
  if (!fs.existsSync(fragmentDir)) {
    fail('fragment directory exists', fragmentDir);
    return finish();
  }
  pass('fragment directory exists');

  const files = fs.readdirSync(fragmentDir).filter(name => name.endsWith('.fragment.js')).sort(naturalCompare);
  names = files;
  if (names.length >= 2) pass('fragments found: ' + names.length);
  else fail('fragments found', String(names.length));

  const head = names.find(name => name === HEAD_FILE);
  if (head) pass('the head fragment is first: ' + names[0]);
  else fail('00-head.fragment.js exists');

  // ---- 1. 构建秩序：编号格式 + 分层带宽 + 拼装一致 ----------------------------------------------
  const bandConfigOk = BANDS.every((band, index) => index === 0 ? band.from === 0 : band.from === BANDS[index - 1].to + 1);
  bandConfigOk ? pass('bands cover 00-99 without a gap') : fail('bands cover 00-99 without a gap');

  for (const name of names) {
    const match = NAME_PATTERN.exec(name);
    if (!match) { fail('fragment name follows N-NN-slug.fragment.js: ' + name); continue; }
    const prefix = Number(match[1]);
    const band = bandOf(prefix);
    if (!band) { fail('fragment number maps to a layer: ' + name, 'no band covers ' + match[1]); continue; }
    // 语义层校验：文件名里的关键词应当落在它自己的带宽里（单复数都算：trends / trend、settings / setting）。
    const stem = name.slice(3, -'.fragment.js'.length).split('-');
    const hits = BANDS.filter(candidate => candidate.hints.some(hint => stem.some(token => token === hint || token.startsWith(hint))));
    const inOwnBand = hits.some(candidate => candidate.from === band.from);
    if (inOwnBand) {
      pass('fragment sits in its own layer: ' + name + ' (' + band.name + ')');
    } else {
      const target = hits[0] ? hits[0].name : 'unknown';
      const detail = 'number says ' + band.name + ', name says ' + target;
      if (Object.prototype.hasOwnProperty.call(LEGACY_BAND_MISMATCH, name) && !strict) {
        warn('legacy fragment sits outside its layer: ' + name, detail + '; ' + LEGACY_BAND_MISMATCH[name]);
      } else {
        fail('fragment sits in its own layer: ' + name, detail);
      }
    }
  }

  // 05 必须紧跟 00：它给后面每一片提供 window.QH。
  if (names[1] === CORE_FILE) pass('the core runtime sorts right after the head: ' + CORE_FILE);
  else fail('the core runtime sorts right after the head', 'found ' + String(names[1]));
  if (names.includes(CORE_FILE)) pass('the core runtime fragment exists');
  else fail('the core runtime fragment exists');

  // 生成物必须与片段一一对应：手改 app.js 或忘记 assemble 都在这里被抓住。
  let assembled = '';
  const concat = names.map(name => fs.readFileSync(path.join(fragmentDir, name), 'utf8')).join('');
  if (!fs.existsSync(assembledPath)) {
    fail('the assembled app.js exists', assembledPath);
  } else {
    assembled = fs.readFileSync(assembledPath, 'utf8');
    if (assembled === concat) pass('app.js equals the concatenated fragments');
    else fail('app.js equals the concatenated fragments', assembled.length + ' vs ' + concat.length + ' bytes; run tools/assemble-app.ps1');
  }

  // ---- 2. 领域层纯净度：零 DOM 铁律 -------------------------------------------------------------
  const domainFiles = names.filter(name => /-domain\.fragment\.js$/.test(name));
  if (domainFiles.length) pass('domain fragments found: ' + domainFiles.join(', '));
  else warn('domain fragments found', 'none yet — the purity rule is armed but idle');
  for (const name of domainFiles) {
    const source = fs.readFileSync(path.join(fragmentDir, name), 'utf8');
    const hits = [];
    for (const [token, why] of DOM_TOKENS) {
      let at = source.indexOf(token);
      while (at >= 0) {
        hits.push(why + ' `' + token + '` at line ' + lineOf(source, at));
        at = source.indexOf(token, at + token.length);
      }
    }
    if (!hits.length) pass('domain layer stays DOM-free: ' + name);
    else fail('domain layer stays DOM-free: ' + name, hits.slice(0, 6).join('; '));
  }

  // ---- 2b. 防回潮：单文件体积上限 + 大列表渲染上限（2026-11-27 Phase 3）-----------------------
  const MAX_FRAGMENT_LINES = 1500;
  const oversized = [];
  for (const name of names) {
    const lineCount = fs.readFileSync(path.join(fragmentDir, name), 'utf8').split(/\r?\n/).length;
    if (lineCount > MAX_FRAGMENT_LINES) oversized.push(name + ' (' + lineCount + ' 行)');
  }
  if (oversized.length) warn('fragment over ' + MAX_FRAGMENT_LINES + ' lines', oversized.join(', '));
  else pass('every fragment stays under ' + MAX_FRAGMENT_LINES + ' lines');

  // 大列表渲染保护：问答历史与记录流默认就要有上限，长周期使用不会无限堆 DOM。
  if (assembled.includes('CHAT_PAGE_SIZE')) {
    const chatCapped = /CHAT_PAGE_SIZE\s*=\s*(\d+)/.test(assembled) && /ordered\.slice\(0, chatShownCount\)/.test(assembled);
    if (chatCapped) pass('the chat history renders a capped page');
    else fail('the chat history renders a capped page', 'CHAT_PAGE_SIZE exists but the render does not clamp to chatShownCount');
  } else {
    fail('the chat history renders a capped page', 'CHAT_PAGE_SIZE missing');
  }
  if (assembled.includes('RECORD_MEALS_COLLAPSED')) {
    const recordsCapped = /RECORD_MEALS_COLLAPSED\s*=\s*(\d+)/.test(assembled) && assembled.includes('rows.slice(0, RECORD_MEALS_COLLAPSED)');
    if (recordsCapped) pass('the records list is capped by default');
    else fail('the records list is capped by default', 'RECORD_MEALS_COLLAPSED exists but the list is not sliced by it');
  } else {
    fail('the records list is capped by default', 'RECORD_MEALS_COLLAPSED missing');
  }

  // ---- 3. 总线合入 + 可执行 --------------------------------------------------------------------
  if (assembled && assembled.includes('QH.bus = QH.bus || {};')) {
    const coreAt = assembled.indexOf('QH.bus = QH.bus || {};');
    const headAt = assembled.indexOf("'use strict';");
    const firstViewAt = assembled.indexOf('function renderTrainingLog(');
    if (headAt >= 0 && coreAt > headAt && (firstViewAt < 0 || coreAt < firstViewAt)) {
      pass('the core runtime is merged into the header of app.js');
    } else {
      fail('the core runtime is merged into the header of app.js', 'core@' + coreAt + ' head@' + headAt + ' training@' + firstViewAt);
    }
  } else {
    fail('the core runtime is merged into app.js', 'window.QH is missing from the generated file');
  }

  const corePath = path.join(fragmentDir, CORE_FILE);
  if (fs.existsSync(corePath)) {
    const coreSource = fs.readFileSync(corePath, 'utf8');
    const runtime = probeNamespace(coreSource);
    for (const [label, ok, detail] of runtime) {
      if (ok) pass(label);
      else fail(label, detail);
    }
  } else {
    fail('the core runtime source is readable', CORE_FILE);
  }

  // ---- 汇总 -----------------------------------------------------------------------------------
  return finish();

  function finish() {
    if (!quiet) {
      console.log('');
      if (errors.length) {
        console.log('Architecture check FAILED: ' + errors.length + ' error(s), ' + warnings.length + ' warning(s), ' + checks + ' checks');
        for (const error of errors) console.log('  - ' + error);
      } else {
        console.log('Architecture check PASSED');
        console.log(checks + ' checks, ' + warnings.length + ' warning(s)' + (warnings.length ? '（存量片段编号偏差，--strict-bands 会按失败处理）' : ''));
      }
    }
    return {ok: errors.length === 0, errors, warnings, checks, fragments: names};
  }
}

/**
 * 把 05-core-runtime 单独放进没有 DOM 的 vm 里跑一遍。
 * 断言的是「行为」，不是「源码里有没有这个词」：define 能挂载、bus 能隔离异常、select 给的是快照。
 */
export function probeNamespace(coreSource) {
  const out = [];
  const check = (label, fn) => {
    try {
      const value = fn();
      out.push([label, value !== false, value === false ? 'assertion failed' : undefined]);
    } catch (error) {
      out.push([label, false, error && error.message ? error.message : String(error)]);
    }
  };
  const sandbox = {window: {}, console: {log() {}, warn() {}, error() {}}};
  const context = vm.createContext(sandbox);
  try {
    vm.runInContext(coreSource, context, {filename: CORE_FILE});
  } catch (error) {
    out.push(['the core runtime runs without a DOM', false, error && error.message ? error.message : String(error)]);
    return out;
  }
  out.push(['the core runtime runs without a DOM', true, undefined]);

  const QH = sandbox.window.QH;
  const expectThrow = fn => {
    try { fn(); return false; } catch { return true; }
  };

  check('QH is published on window', () => {
    if (!QH || typeof QH !== 'object') return false;
    if (typeof QH.define !== 'function' || !QH.bus || !QH.select || !QH.EVENTS) return false;
    const events = QH.EVENTS;
    return events.TRAINING_SAVED === 'training:saved' && events.DIET_SAVED === 'diet:saved'
      && events.WEIGHT_SAVED === 'weight:saved' && events.HABIT_UPDATED === 'habit:updated'
      && events.PREFS_CHANGED === 'prefs:changed';
  });

  check('QH.define mounts a module and records it', () => {
    const api = QH.define('demo', {ping: () => 'pong'});
    return QH.demo === api && api.ping() === 'pong' && QH.has('demo') && QH.list().includes('demo')
      && !!QH._modules.demo && QH._modules.demo.methods.includes('ping') && QH.require('demo') === api;
  });

  check('QH.define refuses duplicates and unknown modules', () =>
    expectThrow(() => QH.define('demo', {other: () => 1}))
    && expectThrow(() => QH.define('bus', {other: () => 1}))
    && expectThrow(() => QH.define('select', {other: () => 1}))
    && expectThrow(() => QH.define('Bad-Name', {other: () => 1}))
    && expectThrow(() => QH.define('data', {payload: {}}))
    && expectThrow(() => QH.require('nope')));

  check('QH.bus isolates a throwing listener', () => {
    const seen = [];
    const thrower = () => { throw new Error('boom'); };
    const good = payload => seen.push(payload.date);
    QH.bus.on(QH.EVENTS.TRAINING_SAVED, thrower);
    const off = QH.bus.on(QH.EVENTS.TRAINING_SAVED, good);
    const delivered = QH.bus.emit(QH.EVENTS.TRAINING_SAVED, {date: '2026-01-02'});
    const counted = QH.bus.count(QH.EVENTS.TRAINING_SAVED) === 2;
    off();
    const removed = QH.bus.count(QH.EVENTS.TRAINING_SAVED) === 1 && QH.bus.off(QH.EVENTS.TRAINING_SAVED, thrower);
    const empty = QH.bus.count(QH.EVENTS.TRAINING_SAVED) === 0 && QH.bus.emit(QH.EVENTS.TRAINING_SAVED, {}) === 0;
    return delivered === 1 && seen.length === 1 && seen[0] === '2026-01-02' && counted && removed && empty
      && expectThrow(() => QH.bus.emit('training', {}));
  });

  check('QH.select hands out frozen snapshots', () => {
    const live = {meals: [{kcal: 500}], profile: {weight: 60}};
    QH.select.define('demo', () => live);
    const snap = QH.select.get('demo');
    const copy = snap !== live && snap.meals !== live.meals && snap.meals[0] !== live.meals[0];
    const frozen = Object.isFrozen(snap) && Object.isFrozen(snap.meals) && Object.isFrozen(snap.meals[0]);
    let threw = false;
    try { 'use strict'; snap.meals[0].kcal = 999; } catch { threw = true; }
    const untouched = live.meals[0].kcal === 500;
    const all = QH.select.snapshot();
    return copy && frozen && (threw || untouched) && all.demo.meals[0].kcal === 500
      && expectThrow(() => QH.select.define('demo', () => ({})))
      && expectThrow(() => QH.select.get('missing'));
  });

  check('QH.storage names an owner for a key', () =>
    QH.storage.claim('demo', ['qingheng.demo']) === 1
    && QH.storage.ownerOf('qingheng.demo') === 'demo'
    && QH.storage.assertWrite('demo', 'qingheng.demo') === true
    && expectThrow(() => QH.storage.assertWrite('training', 'qingheng.demo'))
    && expectThrow(() => QH.storage.claim('training', ['qingheng.demo'])));

  return out;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const strictBands = process.argv.includes('--strict-bands');
  const result = checkArchitecture({strictBands});
  process.exit(result.ok ? 0 : 1);
}
