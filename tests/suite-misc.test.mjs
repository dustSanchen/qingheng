/**
 * 合并后的 misc 套件（由 114 个单文件回归合并而来，2026-11-23）。
 * 每个原文件仍在自己的函数作用域里跑：一个文件抛错只记一条 FAIL，不会中断同组其他文件。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

let __fail = 0;
async function __run(name, fn) {
  try { const n = await fn(); __fail += Number(n) || 0; }
  catch (error) { console.log('FAIL  [' + name + '] ' + (error && error.message ? error.message : error)); __fail += 1; }
}

await __run("app-fragments", async () => {
/**
 * Fragment drift guard.
 *
 * assets/app.js is generated: the fragments under app/src/fragments/ are the source of truth and
 * tools/assemble-app.ps1 concatenates them in filename order. This test fails when someone edits the
 * generated file directly, when a fragment is missing, or when the order changes.
 */


let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const dir = 'app/src/fragments';
const target = 'app/src/main/assets/app.js';

check('the fragment directory exists', fs.existsSync(dir));
const names = fs.readdirSync(dir).filter(name => name.endsWith('.fragment.js')).sort();
check('several fragments exist', names.length >= 5, names.length);
check('fragments are numbered so the order is explicit', names.every(name => /^\d\d-[a-z-]+\.fragment\.js$/.test(name)), names.join(', '));
check('the head fragment comes first', names[0].startsWith('00-'));
check('the boot fragment comes last', names[names.length - 1].startsWith('80-'));

// The browser must not be able to fetch fragments directly: they live outside assets/.
check('fragments are not shipped as separate assets', !fs.existsSync('app/src/main/assets/app'));
check('assets/ stays flat', fs.readdirSync('app/src/main/assets').every(entry => fs.statSync(path.join('app/src/main/assets', entry)).isFile()));

// Rebuild in memory and compare with the generated file, byte for byte.
const assembled = names.map(name => fs.readFileSync(path.join(dir, name), 'utf8')).join('');
const generated = fs.readFileSync(target, 'utf8');
check('assets/app.js equals the concatenated fragments', assembled === generated,
  assembled === generated ? undefined : `${assembled.length} vs ${generated.length} bytes`);
check('the generated file is announced as generated', generated.includes('assembled by tools/assemble-app.ps1'));
check('no fragment carries a stray BOM', names.every(name => !fs.readFileSync(path.join(dir, name), 'utf8').startsWith('\uFEFF')));

// A fragment must be a slice of the same programme, not a standalone script: the IIFE opens in the
// head fragment and closes in the boot fragment.
check('the head fragment opens the IIFE', fs.readFileSync(path.join(dir, names[0]), 'utf8').includes('(() => {'));
const boot = fs.readFileSync(path.join(dir, names[names.length - 1]), 'utf8');
check('the boot fragment closes the IIFE', boot.trimEnd().endsWith('})();'));

// Section ownership: each well-known helper lives in exactly one fragment.
const owners = new Map();
for (const name of names) {
  const body = fs.readFileSync(path.join(dir, name), 'utf8');
  for (const symbol of ['function renderChat(', 'function answerHtml(', 'function computeTargets(', 'async function loadVersions(', 'function saveTrainingLog(', 'async function syncAnchors(']) {
    if (body.includes(symbol)) owners.set(symbol, [...(owners.get(symbol) || []), name]);
  }
}
for (const [symbol, found] of owners) check(`${symbol} lives in exactly one fragment`, found.length === 1, found.join(', '));
check('every probed symbol was found', owners.size === 6, owners.size);

// 并入同一个 IIFE 后，同名函数声明会被后一份静默覆盖。以前只探 6 个手挑符号，所以 dayLabel 重复没被发现。
{
  const assembled = fs.readFileSync('app/src/main/assets/app.js', 'utf8').split(/\r?\n/);
  const declared = new Map();
  for (const line of assembled) {
    const m = /^  (?:async )?function ([A-Za-z_$][\w$]*)\(/.exec(line);
    if (!m) continue;
    declared.set(m[1], (declared.get(m[1]) || 0) + 1);
  }
  const dupes = [...declared].filter(([, n]) => n > 1).map(([name]) => name);
  check('no top-level function is declared twice', dupes.length === 0, dupes.join(', '));
}


{
  const html = fs.readFileSync(new URL('../app/src/main/assets/index.html', import.meta.url), 'utf8');
  for (const tag of ['div', 'article', 'section', 'details']) {
    const open = (html.match(new RegExp('<' + tag + '\\b', 'g')) || []).length;
    const close = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    check('index.html ' + tag + ' tags balance', open === close, open + ' vs ' + close);
  }
}
;return typeof fail === 'number' ? fail : 0;
});

await __run("behavior-calcs", async () => {
/**
 * 计算类行为测试：目标下调公式与临时目标覆盖，直接跑 calc.js，不靠字符串断言。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const ctx = {window: {}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('app/src/main/assets/calc.js', 'utf8'), ctx);
const calc = ctx.window.QinghengCalc;

check('calc module loads', !!calc && typeof calc.adjustedTargets === 'function');

const male = calc.adjustedTargets({sex: 'male', calorieTarget: 2000, fatMin: 40, fatMax: 60});
check('male 2000 drops 10% and rounds to 50', male.ok && male.calorieTarget === 1800, JSON.stringify(male));
check('fat max drops 10% without going under the floor', male.ok && male.fatMax === 54, String(male.fatMax));

const floor = calc.adjustedTargets({sex: 'female', calorieTarget: 1300, fatMin: 40, fatMax: 60});
check('the female safety floor is never crossed', floor.ok && floor.calorieTarget >= 1200, String(floor.calorieTarget));

const atFloor = calc.adjustedTargets({sex: 'male', calorieTarget: 1500, fatMin: 30, fatMax: 50});
check('a target already at the floor is refused', !atFloor.ok && atFloor.reason === 'floor');

const missing = calc.adjustedTargets({sex: 'male', fatMin: 30, fatMax: 50});
check('a missing target is refused', !missing.ok && missing.reason === 'missing');

const base = {min: 1900, max: 2100, trainingDay: {min: 2100, max: 2300}, restDay: {min: 1900, max: 2100}, basis: '减脂'};
const overridden = calc.applyTemporaryRange(base, {calorieTarget: 1800});
check('the temporary value becomes both bounds', overridden.min === 1800 && overridden.max === 1800);
check('training and rest days are overridden too', overridden.trainingDay.max === 1800 && overridden.restDay.min === 1800);
check('the override says it expires tomorrow', overridden.basis === '临时调整，明天恢复');
check('the base range is not mutated', base.min === 1900 && base.trainingDay.max === 2300);
check('no adjustment returns the same range', calc.applyTemporaryRange(base, null) === base);

console.log('\nPASS total: 0 failed');
;return typeof fail === 'number' ? fail : 0;
});

await __run("explain-text", async () => {
// 解释性文本的分类与排版契约（1.4.07）。口径见 docs/design/28-explanatory-text.md。

const root = 'D:/AI/health-android/';
const html = readFileSync(root + 'app/src/main/assets/index.html', 'utf8');
const css = readFileSync(root + 'app/src/main/assets/styles.css', 'utf8');
const app = readFileSync(root + 'app/src/main/assets/app.js', 'utf8');

let pass = 0;
const fails = [];
function check(name, ok) {
  if (ok) { pass++; return; }
  fails.push(name);
}

// ① 说明文本只有一个字号口径，且选择器要比 .card p 更具体 ----------------------------
// 否则卡片里的 <p class="fine-print"> 会被 .card p 的 text-md 抢走字号（11px → 13.5px）。
check('a specific rule owns fine-print typography',
  css.includes('.card p.fine-print,p.fine-print,details p.fine-print{'));
const fontSizes = (css.match(/\.fine-print[^{]*\{[^}]*font-size/g) || []).length;
check('fine-print declares font-size in exactly one rule', fontSizes === 1);
check('the losing .card p does not list fine-print', !css.includes('.card p,.fine-print,'));

// ② 相邻两条说明不再各带一个空行 ------------------------------------------------------
check('adjacent notes sit tight', css.includes('.fine-print + .fine-print{margin-top:2px}'));

// ③ 边界句有独立视觉，且真的被用上 ----------------------------------------------------
check('safe-boundary class exists', css.includes('.note-safe{'));
const safeUses = (html.match(/note-safe/g) || []).length;
check('safe-boundary class is used at least 3 times', safeUses >= 3);

// ④ 指路文案必须指向存在的入口 --------------------------------------------------------
check('no pointer to the removed settings entry', !html.includes('数据、外观与说明') && !app.includes('数据、外观与说明'));
check('consent pointer names the real path', app.includes('我的 → 数据与关于'));
check('key pointer names AI 模型与密钥', app.includes('我的 → AI 模型与密钥'));
check('no pointer to the sub-heading as an entry', !app.includes('我的 → 模型连接'));

// ⑤ 外发授权开关与「数据管理」同页 ----------------------------------------------------
const dataPage = html.indexOf('<div class="subpage" id="subpage-data"');
const consent = html.indexOf('id="settings-consent"');
const nextPage = html.indexOf('</section>', dataPage);
check('consent switch lives inside the data subpage', dataPage > -1 && consent > dataPage && consent < nextPage);
check('consent row keeps its id', html.includes('id="external-consent-row"'));

// ⑥ 删掉的重复文案不再回来 ------------------------------------------------------------
check('browser-demo sentence is gone', !html.includes('浏览器演示只把记录存在本机'));
// 1.4.47：复制一餐卡已删，解释句随之消失；「复制」来源标签仍由数据层写入。
check('copied meals are still tagged at the data layer', app.includes("copy.source = 'quick-copy'") && !html.includes('id="copy-meal-note"'));
check('credits no longer repeat the medical disclaimer', !html.includes('本应用不提供诊断与处方，所有建议只作为你记录的参考'));

// ⑦ 问答页的免责独立成一条边界句 ------------------------------------------------------
check('chat disclaimer is its own boundary line', html.includes('<p class="fine-print note-safe">答案仅供参考，不替代医疗诊断。'));

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) {
  fails.forEach(f => console.log('FAIL ' + f));
}
;return typeof fail === 'number' ? fail : 0;
});

await __run("image-analysis", async () => {

const assets = new URL('../app/src/main/assets/', import.meta.url);
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const java = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/ChatCompletion.java', import.meta.url), 'utf8');
const adapter = fs.readFileSync(new URL('native-adapter.js', assets), 'utf8');

// The regression that blocked photo analysis: /api/state has no settings, so the saved model
// config was replaced by {} on every reload. Run the real source block and prove it survives.
const block = app.match(/const keptSettings[\s\S]*?loaded = true;/);
assert(block, 'loadState keeps the previous settings when the payload has none');

const saved = { apiConfigured: true, visionEnabled: true, visionModel: 'deepseek-flash' };
const ctx = { state: { settings: { ...saved } }, data: { profile: {}, measurements: [], meals: [], habits: [] } };
vm.runInNewContext(block[0], ctx);
assert.deepEqual({ ...ctx.state.settings }, saved, 'settings survive a record reload');
assert.equal(ctx.loaded, true, 'records still load');

// If a payload ever does carry settings, those win.
const ctx2 = { state: { settings: { ...saved } }, data: { profile: {}, measurements: [], meals: [], habits: [], settings: { visionEnabled: false, visionModel: '' } } };
vm.runInNewContext(block[0], ctx2);
assert.equal(ctx2.state.settings.visionEnabled, false, 'an explicit settings payload still wins');

// Settings must be refreshable on their own, at startup and after saving the form.
assert(/async function refreshSettings\(\)/.test(app), 'refreshSettings exists');
assert(/state\.settings = \{\.\.\.\(state\.settings \|\| \{\}\), \.\.\.data\}/.test(app), 'refreshSettings merges instead of replacing');
assert(/\n  refreshSettings\(\);/.test(app), 'startup uses refreshSettings');
assert(/if \(path === '\/api\/settings'\) await refreshSettings\(\)/.test(app), 'saving the model config refreshes it');
assert(!app.includes("state.settings={...state.settings,...data}"), 'no ad-hoc settings merge remains');

// The photo gate must read the refreshed config, and the adapter must keep forwarding the image.
assert(/imageData && \(!state\.settings\.apiConfigured \|\| !state\.settings\.visionEnabled \|\| !state\.settings\.visionModel\)/.test(app), 'meal photo gate reads the model config');
assert(/chatImage && \(state\.settings\.apiConfigured !== true \|\| state\.settings\.visionEnabled !== true/.test(app), 'chat photo gate reads the model config');
assert(/nativeRequest\(path,method,\{\.\.\.body,allowExternal:true\}/.test(adapter), 'the adapter forwards the image payload');
assert(/body\?\.image && \(!config\.visionEnabled \|\| !config\.visionModel\)/.test(adapter), 'the adapter rejects an image without a vision model');

// Parameters are distinct from authentication failures; neither is diagnosed from a bare status alone.
assert(java.includes('code == 400 || code == 422'), 'parameter errors are distinguished');
assert(java.includes('code == 401') && java.includes('HTTP 401：API Key 认证失败'), 'authentication errors remain actionable');

console.log('PASS image analysis: model config survives reloads, refreshes on save, photo gates and 400 hint intact');
;return typeof fail === 'number' ? fail : 0;
});

await __run("paper-pages", async () => {
/**
 * Paper language is shared across pages: same ruled sheet and margin rule, with
 * one hero card per records/trends panel. Ledger keeps its square frame.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('records/trends/profile share the ruled paper sheet', css.includes('[data-skin="paper"] #view-records,[data-skin="paper"] #view-trends,[data-skin="paper"] #view-profile{position:relative;background-image:repeating-linear-gradient'));
check('paper pages do not run a continuous margin line through cards', css.includes('[data-skin="paper"] #view-profile::before{display:none}') && !css.includes('background:rgba(138,82,55'));
check('all paper pages share the header divider', css.includes('[data-skin="paper"] .page-heading{border-bottom:1px solid var(--line)'));
check('records/training/body first card is a paper hero', css.includes('[data-skin="paper"] #view-records .record-panel:not([hidden]) .card:first-of-type'));
check('trends chart is a paper hero', css.includes('[data-skin="paper"] #view-trends .card:first-of-type{background:var(--surface)'));
check('hero headings use the display serif', css.includes('.record-panel:not([hidden]) .card:first-of-type .card-heading h2'));
check('ledger keeps its own divider, not paper texture', css.includes('[data-skin="ledger"] .page-heading{border-bottom:1px solid var(--line)') && !css.includes('[data-skin="ledger"] #view-records::before'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});
console.log('\nFAIL total: ' + __fail);
process.exitCode = __fail ? 1 : 0;
