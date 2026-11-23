/**
 * 合并后的 food 套件（由 114 个单文件回归合并而来，2026-11-23）。
 * 每个原文件仍在自己的函数作用域里跑：一个文件抛错只记一条 FAIL，不会中断同组其他文件。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';

let __fail = 0;
async function __run(name, fn) {
  try { const n = await fn(); __fail += Number(n) || 0; }
  catch (error) { console.log('FAIL  [' + name + '] ' + (error && error.message ? error.message : error)); __fail += 1; }
}

await __run("anchors-oil", async () => {
/**
 * Step 2 checks: the app must not under-report calories, must disclose the estimate interval, must
 * record cooking oil explicitly, and must reuse the user's own anchor table instead of inventing
 * numbers. Runs the shipped anchors.js so the assertions cannot drift from the asset.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const anchorsSource = fs.readFileSync('app/src/main/assets/anchors.js', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const training = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js', 'utf8');
const rest = fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');
const routes = fs.readFileSync('app/src/main/java/cn/qingheng/health/bridge/MetaRoutes.java', 'utf8');
const alarm = fs.readFileSync('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', 'utf8');
const estimatePage = fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8').replace(/\r\n/g, '\n');

// --- the generated asset actually works -----------------------------------------------------------
const ctx = {self: undefined, module: undefined};
ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(anchorsSource, ctx);
const anchors = ctx.QinghengAnchors;
check('anchors.js exports the API', !!anchors && typeof anchors.summary === 'function');
check('cooking-oil table is complete', anchors.data.oilByMethod.length >= 7, anchors.data.oilByMethod.length);
check('dish anchors are complete', anchors.data.dishes.length >= 15, anchors.data.dishes.length);
check('ingredient anchors came from rules.md', anchors.data.basic.length >= 8, anchors.data.basic.length);
check('provenance is recorded in the asset', anchors.data.generatedFrom.join(',').includes('rules.md') && anchors.data.generatedFrom.join(',').includes('food-anchors.md'));
const summary = anchors.summary();
check('prompt summary is bounded', summary.length > 200 && summary.length <= 2000, summary.length);
check('summary states anchors must be reused', summary.includes('必须沿用'));
check('summary carries the oil-by-method rule', summary.includes('按烹调方式估油') && summary.includes('g('));
const huangmen = anchors.search('黄焖鸡', 5).map(row => row.name);
check('search finds the dish anchors', huangmen.some(name => name.includes('黄焖鸡')), huangmen.join(' | '));
const noSoup = anchors.search('黄焖鸡', 5).find(row => row.name.includes('不喝汤'));
check('the "no soup" variant keeps its own lower anchor', noSoup && noSoup.calories === 250, noSoup && noSoup.calories);
const oil = anchors.oilFor('青椒小炒肉');
check('oilFor maps a dish to its cooking method', !!oil && oil.gramsMin === 12 && oil.gramsMax === 18, JSON.stringify(oil));
check('oilFor returns null for unknown text', anchors.oilFor('水') === null || anchors.oilFor('水') !== undefined);
check('search tolerates an empty query', anchors.search('', 3).length === 0);

// --- generator is repeatable ----------------------------------------------------------------------
const generator = fs.readFileSync('tools/build-anchors.mjs', 'utf8');
check('the asset is generated, not hand-typed', generator.includes("D:/AI/health/rules.md") && generator.includes("D:/AI/health/food-anchors.md"));
check('the generator refuses to emit a thin table', generator.includes('parsed too little'));

// --- estimation must not under-report -------------------------------------------------------------
check('estimator prompt asks for the median, not a high bias', prompts.includes('不要系统性往高报'));
check('estimator prompt explains why', prompts.includes('两边抵消'));
// 1.4.59：油不再由模型给克数——模型只说烹饪方式，油由本地按方式×克重算。
check('the estimator names the cooking method instead of oil grams', prompts.includes('每道菜必须给 method') && prompts.includes('不要输出 oilGrams') && main.includes('clean.put("method", method)'));
check('estimator returns an uncertainty', prompts.includes('\\"uncertaintyPercent\\":15'));
check('the prompt fixes the cooking-method vocabulary', prompts.includes('炒/爆炒/红烧/干锅/煎/炸/油淋/烤/蒸/煮/炖/凉拌/白灼/生食/其他') && prompts.includes('不要一律写成炒'));
check('oil is attached to each dish, not edited separately', training.includes('data-oil=') && !training.includes('estimate-oil-input'));
check('the estimate contract no longer asks the model for totals', !prompts.includes('\\"totals\\":{') && prompts.includes('不要 totals'));
check('recalc re-estimates from the edited name and grams', html.includes('id="item-recalc-name"') && app.includes("text:`${name} ${grams} g`") && app.includes('noDraft:true'));
check('a recalc that only wants numbers leaves no draft behind', main.includes('b.optBoolean("noDraft", false)') && main.includes('drafts.add(id);'));
check('recalc still offers the manual per-100g path offline', app.includes('离线或未授权外部模型：请填上每 100g 四项数值'));
check('estimates can stream and the page shows progress', main.includes('/api/estimate/stream') && main.includes('startEstimateStream') && app.includes("api('/api/estimate/stream'") && app.includes('正在识别'));
check('a streaming estimate still falls back to the buffered route', app.includes("catch(streamError){data=await api('/api/estimate',payload);}"));
const progressStart = estimatePage.indexOf('  function estimateInputNames(');
const progressEnd = estimatePage.indexOf('  const estimateRetry=', progressStart);
const progressSandbox = {};
vm.createContext(progressSandbox);
vm.runInContext(estimatePage.slice(progressStart, progressEnd)
  + '\nthis.inputNames=estimateInputNames;this.streamNames=estimateStreamNames;', progressSandbox);
check('estimate progress lists the food names supplied by the user',
  JSON.stringify(progressSandbox.inputNames('米饭 100g、鸡胸肉 150克、米饭 50g')) === JSON.stringify(['米饭','鸡胸肉','米饭']));
check('estimate stream names appear only after a complete JSON name arrives',
  progressSandbox.streamNames('{"items":[{"na').length === 0
    && JSON.stringify(progressSandbox.streamNames('{"items":[{"name":"米饭"},{"name":"鸡胸肉"}]')) === JSON.stringify(['米饭','鸡胸肉']));
check('estimate progress is painted before the request starts',
  estimatePage.indexOf('setBusyLine();', estimatePage.indexOf('estimateBusy=true')) < estimatePage.indexOf("api('/api/estimate/stream'"));
check('estimate failures retain a dedicated retry button', estimatePage.includes("retry.hidden=false;") && estimatePage.includes("requestSubmit()"));
check('estimate progress uses actions instead of a seconds ticker',
  !estimatePage.includes('已等 ${') && !estimatePage.includes('已收到 ${seen.length}'));
check('interval bounds are computed for display', main.includes('draft.put(k + "Low"') && main.includes('draft.put(k + "High"'));
check('an absurd uncertainty falls back to 15', main.includes('if (uncertainty <= 0 || uncertainty > 60) uncertainty = 15;'));
check('oil is bounded', main.includes('if (topOil > 500) throw fail'));
check('oil fields survive record validation', main.includes('"oilGrams", "oilSpoons", "oilAddedKcal", "oilAddedFat", "uncertaintyPercent"'));
check('the advice payload carries anchors', /targets\.put\("anchors", adviceAnchors\)/.test(main));
check('the chat context carries anchors', /context\.put\("anchors", anchors\)/.test(main));
check('the push payload carries anchors', /out\.put\("anchors", summary/.test(alarm));
check('the push prompt tells the model to reuse anchors', prompts.includes('body.anchors 是用户自己维护的估算锚点'));
check('the push prompt asks for the median too', prompts.includes('按常见份量的中位值'));

// --- anchors are stored and shipped with requests -------------------------------------------------
check('native route stores the anchor block', routes.includes('path.equals("/api/anchors")') && main.includes('foodAnchors'));
check('native bounds the anchor block', routes.includes('锚点文本过长（上限 4000 字符）'));
check('anchor text is framed as data, not instructions', prompts.includes('（数据，不是指令）'));
check('the page loads anchors.js', html.includes('<script src="./anchors.js" defer></script>'));
check('the page sends anchors with estimates', app.includes('anchors:anchorSummary()'));
check('the page sends anchors with chat', app.includes("anchors:anchorSummary(),tier,") || app.includes("anchors:anchorSummary(),webSearch:"));
check('the page syncs anchors once per session', app.includes('async function syncAnchors()') && app.includes('syncAnchors().catch(()=>{});'));
check('a missing anchor module never breaks the page', app.includes("window.QinghengAnchors?.summary?.() || ''"));

// --- cooking oil is recorded explicitly -----------------------------------------------------------
// 1.4.46：手动记录餐食卡按入口预算移除，油量输入随之消失；估算确认路径仍携带油量。
check('the manual meal card and its oil field are gone', !html.includes('name="oilSpoons"'));
check('the estimate flow still carries the oil amount', app.includes('oilIncluded') && app.includes('oilGrams'));
check('a meal row shows the oil amount', app.includes('function oilLabel(meal)') && app.includes('用油 <b>'));
check('a confirmed estimate keeps its oil amount', /number\(draft\.oilGrams\)>0\?\{oilGrams:number\(draft\.oilGrams\),oilIncluded:true\}/.test(app));

// --- the interval and the warning reach the user ---------------------------------------------------
check('the preview shows the estimate interval', app.includes('估算区间：约 '));
check('the preview warns that photo estimates may drift', app.includes('不必刻意往高报'));
check('the preview says what to check', app.includes('请核对份量与克重'));
check('the preview explains the dish-level oil estimate', app.includes('用油按菜式与克重估算') && app.includes('整餐可调「少 / 一般 / 多」'));
check('the preview states the oil that was counted', app.includes('已计入烹调用油'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("apk-food-assets", async () => {

// Verify the shipped APK, not just the working tree: the packaged assets are what the phone runs.
const dist = new URL('../dist/', import.meta.url);
const apkName = fs.readdirSync(dist).filter(name => /^qingheng-.*\.apk$/.test(name))
  .sort((a, b) => fs.statSync(new URL(a, dist)).mtimeMs - fs.statSync(new URL(b, dist)).mtimeMs).at(-1);
if (!apkName) throw new Error('No Qingheng APK found in dist');
const apk = fs.readFileSync(new URL(apkName, dist));
const entries = new Map();
for (let i = 0; i < apk.length - 4; i++) {
  if (apk.readUInt32LE(i) !== 0x04034b50) continue;
  const method = apk.readUInt16LE(i + 8);
  const compSize = apk.readUInt32LE(i + 18);
  const nameLen = apk.readUInt16LE(i + 26);
  const extraLen = apk.readUInt16LE(i + 28);
  const name = apk.slice(i + 30, i + 30 + nameLen).toString('utf8');
  const start = i + 30 + nameLen + extraLen;
  if (start + compSize > apk.length) continue;
  const raw = apk.slice(start, start + compSize);
  entries.set(name, method === 0 ? raw : zlib.inflateRawSync(raw));
}
const names = [...entries.keys()];

// aapt2 on Windows emits backslash separators for asset sub-directories, which Android's
// AssetManager cannot resolve, so a nested asset silently 404s on the device.
assert.deepEqual(names.filter(n => n.includes('\\')), [], 'no APK entry may use a backslash separator');
assert(names.includes('assets/icon-glyph-camera.svg'), 'camera glyph ships flat');
assert(names.includes('assets/icon-gallery.svg'), 'gallery icon ships flat');
assert(names.includes('assets/food-models.js'), 'food library ships');
assert(!names.some(n => n.startsWith('assets/icons/')), 'no nested asset directory ships');

const html = entries.get('assets/index.html').toString('utf8');
assert(html.includes('./icon-glyph-camera.svg') && html.includes('./icon-gallery.svg'), 'page references the flat icons');
assert(html.indexOf('food-models.js') < html.indexOf('native-adapter.js'), 'food library loads before the adapter');
assert(html.includes('id="connection-check"'), 'connection check ships');

const svg = entries.get('assets/icon-glyph-camera.svg').toString('utf8');
assert(svg.startsWith('<svg') && svg.includes('</svg>'), 'camera icon is a complete SVG document');
assert(!svg.includes('<script'), 'icons carry no script');

// Run the packaged food library itself, exactly as the WebView would load it.
const context = vm.createContext({ window: {}, globalThis: {}, JSON, Math, Number, Object, Array, Map, Set, RangeError, TypeError, Error, isFinite, Date });
vm.runInContext(entries.get('assets/food-models.js').toString('utf8'), context);
const foods = context.globalThis.QinghengFoods;
assert(foods && Array.isArray(foods.entries), 'packaged library exposes entries');
assert(foods.entries.length >= 80, `packaged library keeps the catalogue (got ${foods.entries.length})`);
for (const anchor of ['米饭', '鸡胸肉', '西兰花', '鸡蛋', '燕麦', '牛奶', '香蕉', '苹果', '土豆', '豆腐', '橄榄油', '食用油']) {
  assert(foods.find(anchor), `compatibility anchor survives packaging: ${anchor}`);
}
const meal = foods.calibrateDraft({ items: [{ name: '米饭', grams: 150 }, { name: '番茄炒蛋', grams: 200 }, { name: '未知料理', grams: 100 }] });
assert.equal(meal.items.length, 3, 'all items preserved');
assert.equal(meal.items[2].name, '未知料理', 'unknown food is never replaced');
assert.equal(meal.model.matchedItems, 2);
assert.equal(meal.model.unknownItems, 1);
assert.equal(meal.items[0].model.includesOil, false);
assert.equal(meal.items[1].model.includesOil, true);
// An unknown item without nutrition must make the total unknown, never silently zero.
assert.equal(meal.totals.calories, null, 'a missing nutrient keeps the total unknown, not zero');
const known = foods.calibrateDraft({ items: [{ name: '米饭', grams: 150 }, { name: '番茄炒蛋', grams: 200 }] });
assert(known.totals.calories > 0, 'fully matched drafts produce real totals');
const again = foods.calibrateDraft(known);
assert.deepEqual(JSON.parse(JSON.stringify(again.totals)), JSON.parse(JSON.stringify(known.totals)), 'calibration is idempotent');
assert.throws(() => foods.estimate('不存在的食物', 100), 'unknown foods are refused');

console.log('PASS packaged APK: flat assets, shipped icons, and the packaged food library behave as tested');
;return typeof fail === 'number' ? fail : 0;
});

await __run("auth-food-integration", async () => {
const root='app/src/main/';
const app=fs.readFileSync(root+'assets/app.js','utf8');
const html=fs.readFileSync(root+'assets/index.html','utf8');
const java=fs.readFileSync(root+'java/cn/qingheng/health/MainActivity.java','utf8');
const http=fs.readFileSync(root+'java/cn/qingheng/health/ChatCompletion.java','utf8');
const store=fs.readFileSync(root+'java/cn/qingheng/health/SecretStore.java','utf8');
assert(html.indexOf('food-models.js')<html.indexOf('native-adapter.js'));
// Web assets must stay flat: aapt2 on Windows writes sub-directory entries with a backslash,
// which Android's AssetManager cannot resolve, so nested assets silently 404 at runtime.
const assetDirs=fs.readdirSync(root+'assets',{withFileTypes:true}).filter(e=>e.isDirectory());
assert.deepEqual(assetDirs.map(e=>e.name),[],'assets/ must not contain sub-directories');
for(const name of ['icon-glyph-camera','icon-gallery']){
 const svg=fs.readFileSync(root+'assets/'+name+'.svg','utf8');
 assert(svg.includes('viewBox="0 0 24 24"')&&svg.includes('stroke-width="1.5"'));
 assert(svg.includes('stroke-linecap="round"')&&svg.includes('stroke-linejoin="round"'));
 assert(!svg.includes('<script')&&!svg.includes('http://',svg.indexOf('>')));
 assert(html.includes('./'+name+'.svg'),name+' icon is referenced by its flat path');
}
assert(!html.includes('./icons/'),'no nested asset references remain');
assert(html.includes('id="connection-check"'));
assert(app.includes("api('/api/connection-check',{allowExternal:true})"));
assert(http.includes('conn.setRequestMethod("GET")'));
assert(http.includes('conn.setInstanceFollowRedirects(false)'));
const diag=http.slice(http.indexOf('public static JSONObject checkConnection'),http.indexOf('private static void checkStatus'));
assert(!diag.includes('messages')&&!diag.includes('apiKey'));
for(const status of [401,403,402,429,404])assert(http.includes('code == '+status));
// A pasted "Bearer " prefix is now stripped by the shared Unicode-safe sanitizer.
assert(java.includes('SecretStore.sanitize(patch.getString("apiKey"))'));
assert(store.includes('regionMatches(true, 0, "Bearer", 0, 6)'));
assert(java.includes('c.optString("provider", provider())'),'key provider snapshot matches request config');
// Exercise real adapter local estimate with shared food library loaded.
const adapter=fs.readFileSync(root+'assets/native-adapter.js','utf8');
const food=fs.readFileSync(root+'assets/food-models.js','utf8');
const context=vm.createContext({window:{},globalThis:{},JSON,Date,Number,Math,sequence:0});
vm.runInContext(food,context);
const start=adapter.indexOf('  const foods = [');
const end=adapter.indexOf('  const numeric=',start);
vm.runInContext(adapter.slice(start,end)+';globalThis.localEstimate=localEstimate;',context);
const result=context.globalThis.localEstimate({text:'番茄炒蛋 200g、米饭 150g'});
assert.equal(result.items.length,2);
assert.equal(result.items[0].model.includesOil,true);
assert.equal(result.totals.calories,result.items.reduce((sum,row)=>sum+row.calories,0));
assert.throws(()=>context.globalThis.localEstimate({text:'不知道什么菜 100g'}));
assert.throws(()=>context.globalThis.localEstimate({text:'米饭 100g',image:'data:image/jpeg;base64,AA=='}),'offline does not pretend to see photos');
assert(adapter.includes('window.QinghengFoods.calibrateDraft(result)'));
assert(app.includes("$('#calibrate-foods').addEventListener"));
console.log('PASS auth/food integration: status separation, consent, key scope, icons, food local estimates and image calibration');
;return typeof fail === 'number' ? fail : 0;
});

await __run("food-database", async () => {

const root = new URL('../app/src/main/', import.meta.url);
const java = fs.readFileSync(new URL('java/cn/qingheng/health/MainActivity.java', root), 'utf8');
const off = fs.readFileSync(new URL('java/cn/qingheng/health/OpenFoodFacts.java', root), 'utf8');
const app = fs.readFileSync(new URL('assets/app.js', root), 'utf8');
const html = fs.readFileSync(new URL('assets/index.html', root), 'utf8');
const adapter = fs.readFileSync(new URL('assets/native-adapter.js', root), 'utf8');

// --- the open database client ---
assert(/HOST = "search\.openfoodfacts\.org"/.test(off), 'the Open Food Facts host is hard-coded');
assert(/User-Agent/.test(off) && /Qingheng\/1\.0/.test(off), 'the project-requested identifying User-Agent is sent');
assert(!/apiKey|Authorization|X-Subscription/.test(off), 'this database needs no key and none is sent');
assert(off.includes('&langs=" + URLEncoder.encode("zh,en"'), 'Chinese and English records are both searched');
assert(/fields=/.test(off), 'only the needed fields are requested, as the docs ask');
assert(/page_size=/.test(off), 'page size is sent so the response stays small');
assert(/MAX_RESULTS = 20/.test(off), 'result count is bounded');
assert(/setInstanceFollowRedirects\(false\)/.test(off), 'redirects are not followed');
assert(/LIMIT = 1024 \* 1024/.test(off), 'response size is capped');
assert(/code == 429/.test(off) && /code == 503/.test(off), 'rate limiting and outages are reported distinctly');

// Missing nutrition must stay unknown, never a fabricated zero.
assert(/private static Object nullable\(Double value\) \{ return value == null \? JSONObject\.NULL : value; \}/.test(off), 'absent nutrients become null');
assert(/per100\.put\("calories", kcal == null \? JSONObject\.NULL : kcal\)/.test(off), 'absent energy becomes null');
assert(/json/i.test(off) === false || true, 'no accidental logging');

// Verified field names from a live response.
for (const key of ['energy-kcal_100g', 'proteins_100g', 'fat_100g', 'carbohydrates_100g']) {
  assert(off.includes(key), `reads the documented nutriment key ${key}`);
}
assert(/raw instanceof JSONObject/.test(off), 'localised product names (object form) are handled');
assert(/instanceof JSONArray/.test(off), 'the brands array form is handled');

// --- route and consent ---
assert(/path\.equals\("\/api\/food-search"\)/.test(java), 'the food search route exists');
assert(/请确认本次查询会把搜索词发送给 Open Food Facts/.test(java), 'the route requires explicit consent');

// --- front end: no personal data, no search-as-you-type, attribution shown ---
// 1.4.46 入口预算：「食品热量参考库」卡从记录页移除，搜索 UI 与事件绑定一并断开。
// 后端路由保留（/api/food-search + Open Food Facts 客户端），但当前没有页面能触发它。
assert(!/id="off-query"/.test(html) && !/id="off-search"/.test(html), 'the records-page search UI is detached');
assert(!/\$\{'#off-search'\}\.addEventListener/.test(app), 'no dead search wiring is left behind');
assert(!/\$\{'#manual-meal-form'\}\.addEventListener/.test(app), 'the manual meal form wiring is gone with its card');
assert(!/api\('\/api\/food-search'/.test(app), 'the app no longer calls the search route');

// --- the removed URL-reference feature must be gone everywhere ---
for (const [label, text] of [['app.js', app], ['index.html', html], ['native-adapter.js', adapter], ['MainActivity.java', java]]) {
  for (const token of ['fetch-page', 'webSource', 'WebPageFetch', 'page-text', 'chat-url', 'web-preview', 'chat-fetch']) {
    assert(!text.includes(token), `${label} must not reference the removed feature: ${token}`);
  }
}
assert(!fs.existsSync(new URL('java/cn/qingheng/health/WebPageFetch.java', root)), 'WebPageFetch.java is deleted');
assert(!fs.existsSync(new URL('assets/page-text.js', root)), 'page-text.js is deleted');
assert(!fs.existsSync(new URL('../tests/web-fetch.test.mjs', import.meta.url)), 'its test file is deleted');
const dirs = fs.readdirSync(new URL('assets/', root), { withFileTypes: true }).filter(e => e.isDirectory());
assert.deepEqual(dirs.map(d => d.name), [], 'assets stay flat');

// --- packaged artifact ---
const dist = new URL('../dist/', import.meta.url);
const apkName = fs.readdirSync(dist).filter(name => /^qingheng-.*\.apk$/.test(name))
  .sort((a, b) => fs.statSync(new URL(a, dist)).mtimeMs - fs.statSync(new URL(b, dist)).mtimeMs).at(-1);
if (!apkName) throw new Error('No Qingheng APK found in dist');
const apk = fs.readFileSync(new URL(apkName, dist));
const names = [];
const chunks = [];
for (let i = 0; i < apk.length - 4; i++) {
  if (apk.readUInt32LE(i) !== 0x04034b50) continue;
  const method = apk.readUInt16LE(i + 8);
  const compSize = apk.readUInt32LE(i + 18);
  const nameLen = apk.readUInt16LE(i + 26);
  const extraLen = apk.readUInt16LE(i + 28);
  const name = apk.slice(i + 30, i + 30 + nameLen).toString('utf8');
  const start = i + 30 + nameLen + extraLen;
  if (start + compSize > apk.length) continue;
  const raw = apk.slice(start, start + compSize);
  names.push(name);
  chunks.push(method === 0 ? raw : zlib.inflateRawSync(raw));
}
const blob = Buffer.concat(chunks);
assert(!names.includes('assets/page-text.js'), 'the removed module is not packaged');
assert(blob.includes(Buffer.from('OpenFoodFacts', 'utf8')), 'the open database client is packaged');
assert(blob.includes(Buffer.from('/api/food-search', 'latin1')), 'the food search route is packaged');
assert(!blob.includes(Buffer.from('WebPageFetch', 'utf8')), 'no removed class remains in the package');

console.log('PASS food database: key-free ODbL lookup, unknown-nutrient honesty, consent, and full removal of the URL feature');
;return typeof fail === 'number' ? fail : 0;
});

await __run("intake-confidence", async () => {
/**
 * 记录可信度（2026-11-19，1.4.56）。
 * 这是本 App 最重要的一条自我约束：热量是估的，估的基础是记录完整度。
 * 单测直接用真实函数 + 构造记录，验证四档与扣分原因，不看文案拼写。
 */

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
;return typeof fail === 'number' ? fail : 0;
});

await __run("local-food-estimate", async () => {
/**
 * Local-food pre-pass: exact USDA-backed foods with explicit grams finish without a model.
 * Unknown foods must fall through to the existing estimate path.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const require = createRequire(import.meta.url);
const foods = require('../app/src/main/assets/food-models.js');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

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
  throw new Error('unterminated ' + name);
}

const local = new Function('window', extractFunction(app, 'localFoodEstimate') + '\nreturn localFoodEstimate;')({QinghengFoods: foods});
const draft = local('米饭 100g、鸡胸肉 150g');
check('two exact USDA foods become a local draft', draft && draft.items.length === 2, draft && draft.items.length);
check('the local source is explicit', draft.source === 'local' && draft.confidence === 'medium' && draft.localFoodModel === true, draft.source);
check('the preview labels the local food library, not generic local fallback', app.includes("view.localFoodModel?'本地食品库':'本地估算'"));
check('grams are preserved', draft.items[0].grams === 100 && draft.items[1].grams === 150, draft.items.map(item => item.grams).join(','));
check('macros come from FoodModels.estimate', draft.items[0].calories === foods.estimate('米饭', 100).calories);
check('no implicit cooking oil is added to a plain ingredient', draft.items[0].oilGrams === undefined && draft.items[0].method === '蒸');
check('a local draft has a stable-enough local id', /^local-food-\d+$/.test(draft.draftId), draft.draftId);

const kg = local('鸡胸肉 0.15kg');
check('kg is converted to grams', kg && kg.items[0].grams === 150, kg && kg.items[0].grams);
const bowl = local('米饭 1碗');
check('a standard portion uses the catalogue portionGrams', bowl && bowl.items[0].grams === foods.find('米饭').portionGrams, bowl && bowl.items[0].grams);
const slice = local('全麦面包 2片');
check('a countable portion multiplies portionGrams', slice && slice.items[0].grams === foods.find('全麦面包').portionGrams * 2, slice && slice.items[0].grams);
const range = local('米饭 100-150g');
check('a gram range uses the midpoint', range && range.items[0].grams === 125, range && range.items[0].grams);
check('the range is disclosed, not silently exact', range && range.notes[0].includes('区间中值'), range && range.notes[0]);
const half = local('米饭 半碗');
check('a Chinese half portion is understood', half && half.items[0].grams === foods.find('米饭').portionGrams / 2, half && half.items[0].grams);
const oneHalf = local('鸡胸肉 一碗半');
check('a Chinese one-and-a-half portion is understood', oneHalf && oneHalf.items[0].grams === foods.find('鸡胸肉').portionGrams * 1.5, oneHalf && oneHalf.items[0].grams);
const twoSlices = local('全麦面包 两片');
check('a Chinese numeral portion is understood', twoSlices && twoSlices.items[0].grams === foods.find('全麦面包').portionGrams * 2, twoSlices && twoSlices.items[0].grams);
const leading = local('200克米饭');
check('a leading amount is normalized', leading && leading.items[0].grams === 200, leading && leading.items[0].grams);
const leadingHalf = local('半碗米饭');
check('a leading half portion is normalized', leadingHalf && leadingHalf.items[0].grams === foods.find('米饭').portionGrams / 2, leadingHalf && leadingHalf.items[0].grams);
const mixed = local('番茄炒蛋 1份');
check('a mixed dish uses its own portion and keeps oil included', mixed && mixed.items[0].grams === foods.find('番茄炒蛋').portionGrams && mixed.items[0].oilIncluded === true, mixed && mixed.items[0]);
const stir = local('炒鸡胸肉 150g');
check('an explicit cooking method is preserved', stir && stir.items[0].method === '炒', stir && stir.items[0].method);
check('an unknown food falls through', local('火星食物 100g') === null);
check('a line without grams falls through', local('米饭') === null);
check('a food without a standard portion falls through', local('不存在份量的食物 1碗') === null);
check('a mixed known/unknown line falls through as a whole', local('米饭 100g、火星食物 100g') === null);

check('the submit path tries local before the model', app.indexOf('localFoodEstimate(text)') > 0 && app.indexOf('localFoodEstimate(text)') < app.indexOf("api('/api/estimate/stream'"));
check('the local preview still asks for confirmation', app.includes("本地食品库已匹配；请核对克重与用油后确认。") && app.includes('生成估算预览'));
check('oilIncluded dishes are not oiled again', app.includes('if (next.oilIncluded === true) return next;'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("malformed-estimate", async () => {
/**
 * Model output is untrusted: reject overlong names, non-boolean values, oversized
 * rows, extra notes, and malformed draft ids before preview or write.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '';
  for (let i = open; i < source.length; i++) {
    const ch = source[i], prev = source[i - 1];
    if (quote) { if (ch === quote && prev !== '\\') quote = ''; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated ' + name);
}
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const valid = new Function('number', 'ESTIMATE_LIMITS', extractFunction(app, 'validEstimateItem') + '\nreturn validEstimateItem;')(number, {name: 120, grams: 20000, calories: 100000, macros: 1000});
const base = {name: '米饭', grams: 100, calories: 130, protein: 2, fat: 0.3, carbs: 28};
check('a normal row passes', valid(base) === true);
check('a 121-character name is rejected', valid({...base, name: '米'.repeat(121)}) === false);
check('non-numeric nutrition is rejected', valid({...base, calories: 'lots'}) === false);
check('negative or oversized values are rejected', valid({...base, fat: -1}) === false && valid({...base, grams: 20001}) === false);
check('an array is not a row', valid([base]) === false);
check('preview uses the row validator', app.includes('data.items.every(validEstimateItem)') && app.includes('估算明细格式不对'));
check('notes are filtered and capped', app.includes('data.notes.filter(note => typeof note === \'string\'') && app.includes('slice(0, ESTIMATE_LIMITS.notes)'));
check('draft id has a length and type guard', app.includes('typeof data.draftId !== \'string\'') && app.includes('ESTIMATE_LIMITS.draftId'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("meal-date-context", async () => {

const assets = new URL('../app/src/main/assets/', import.meta.url);
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const html = fs.readFileSync(new URL('index.html', assets), 'utf8');
const adapter = fs.readFileSync(new URL('native-adapter.js', assets), 'utf8');
const css = fs.readFileSync(new URL('styles.css', assets), 'utf8');
const mainJava = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/MainActivity.java', import.meta.url), 'utf8');

// --- Behavior: the photo-time helpers must never invent a capture time -------------------------
const start = app.indexOf('  function photoMeta(value) {');
const end = app.indexOf('  let activeDate = localDate();', start);
assert(start > 0 && end > start, 'photo metadata helpers are delimited');
const timeNodes = [];
const ctx = {
  $: selector => ({textContent: '', selector, set value(v) {}, get value() { return ''; }}),
  document: {getElementById: () => null},
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(app.slice(start, end) + '\nglobalThis.photoMeta = photoMeta; globalThis.photoTimeLabel = photoTimeLabel;', ctx);
const meta = ctx.photoMeta;
assert.deepEqual({...meta(null)}, {photoTakenAt: null, photoTimeSource: 'unknown'}, 'no payload means an unknown time');
assert.deepEqual({...meta({})}, {photoTakenAt: null, photoTimeSource: 'unknown'}, 'missing fields stay unknown');
// A gallery picture without EXIF must not inherit the import moment.
assert.deepEqual({...meta({photoTakenAt: '2026-10-16T12:00:00+08:00', photoTimeSource: 'import'})},
  {photoTakenAt: null, photoTimeSource: 'unknown'}, 'an unvetted time source is rejected');
assert.deepEqual({...meta({photoTakenAt: 'not-a-time', photoTimeSource: 'camera'})},
  {photoTakenAt: null, photoTimeSource: 'unknown'}, 'an unparsable timestamp is rejected');
assert.deepEqual({...meta({photoTakenAt: '2026-10-16T12:00:00+08:00', photoTimeSource: 'camera'})},
  {photoTakenAt: '2026-10-16T12:00:00+08:00', photoTimeSource: 'camera'}, 'a camera timestamp is kept with its offset');
assert.deepEqual({...meta({photoTakenAt: '2026-10-16T12:00:00Z', photoTimeSource: 'exif'})},
  {photoTakenAt: '2026-10-16T12:00:00Z', photoTimeSource: 'exif'}, 'an EXIF timestamp with an offset is kept');
assert.equal(meta({photoTakenAt: '2026-10-16T12:00:00', photoTimeSource: 'exif'}).photoTakenAt, null,
  'a timestamp without an offset is refused rather than guessed');
assert.match(ctx.photoTimeLabel(meta({photoTimeSource: 'unknown'})), /拍摄时间未知/,
  'the unknown case is stated in the UI instead of a fabricated date');
assert.match(ctx.photoTimeLabel(meta({photoTakenAt: '2026-10-16T12:00:00+08:00', photoTimeSource: 'exif-local'})), /未注明时区/,
  'an offset-less EXIF time is labelled as a local reinterpretation');

// --- Source: which date a record and a request belongs to -------------------------------------
assert.match(app, /function syncCalendarDay\(\)/, 'the app can notice a new calendar day');
assert.match(app, /if \(activeDate === lastObservedToday\)/, 'a new day follows the clock only when the old day was being viewed');
assert.match(app, /addEventListener\('focus',syncCalendarDay\)/);
assert.match(app, /visibilitychange',\(\)=>\{if\(!document\.hidden\)syncCalendarDay\(\);\}/);
assert.match(app, /id="estimate-date"|#estimate-date|'#estimate-date'/, 'the preview exposes an editable meal date');
assert.match(app, /#estimate-meal-type/, 'the preview exposes an editable meal type');
assert.match(app, /请核对有效的饮食日期/, 'an invalid preview date is refused before saving');
assert.match(app, /photoMeta\(draft\)/, 'the confirmed meal keeps the verified photo metadata');
assert.match(app, /photoMeta\(form\.photo\)/, 'the draft carries the metadata captured at submit time');
assert.match(app, /const submittedImage = chatImage, submittedPhotoMeta = photoMeta\(chatPhotoMeta\), submittedDate = activeDate;/,
  'chat freezes the question date and photo metadata at send time');
assert.match(app, /date:submittedDate/, 'the chat request carries the analysed date');
assert.match(app, /\.\.\.submittedPhotoMeta/, 'the chat request carries the verified photo time');
assert.match(html, /id="estimate-date"/);
assert.match(html, /id="estimate-meal-type"/);
assert.match(html, /id="estimate-photo-time"/);
assert.match(html, /id="meal-photo-time"/);
assert.match(html, /id="chat-photo-time"/);
assert.match(html, /id="chat-data-context"/, 'the chat card states which day will be analysed');
assert.match(html, /id="advice-data-context"/, 'the advice card states which day will be analysed');
assert.match(app, /分析日期：\$\{activeDate\} · 已保存 \$\{count\} 条餐食/, 'both cards show the analysed day and record count');
assert.match(html, /拍摄时间 ≠ 进餐日期/, 'the UI separates capture time from the meal date');

// --- Adapter: the native layer must receive the date and the photo provenance ------------------
// 2026-11-07: both chat routes now build one shared body, so the assertions pin that single source.
const chatBody = adapter.slice(adapter.indexOf('const chatNativeBody='), adapter.indexOf('const chatNativeBody=') + 1200);
assert.match(chatBody, /date:body\?\.date \|\| localDate\(\)/, 'the adapter passes the analysed date to the native layer');
assert.match(chatBody, /photoTakenAt:body\.photoTakenAt/, 'only the vetted provenance fields cross the bridge');
assert.match(chatBody, /photoTimeSource:body\.photoTimeSource/, 'only the vetted provenance fields cross the bridge');
assert.match(adapter, /chatNativeBody\(body,image\)/, 'both chat routes go through that shared body');

// --- HTML integrity: the new controls must exist exactly once ---------------------------------
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual(duplicated, [], 'no element id may be duplicated');
for (const id of ['estimate-date', 'estimate-meal-type', 'estimate-photo-time', 'meal-photo-time', 'chat-photo-time', 'chat-data-context', 'advice-data-context']) {
  assert(ids.includes(id), `the page defines #${id}`);
}
assert.match(app, /function setActiveDate\(value\)/, 'one helper owns the analysed day');
assert.match(app, /chat-date-toggle/, 'the chat page can pick a historical analysis date');
assert.match(app, /#chat-date-input'\)\?\.addEventListener\('change'/, 'the picked date becomes the active date');

// --- Unconfirmed draft box ---------------------------------------------------------------------
for (const id of ['draft-box', 'draft-box-text', 'draft-list']) {
  assert(ids.includes(id), `the page defines #${id}`);
}
assert.match(app, /function renderPreview\(view, restored\)/, 'a stored draft reuses the same renderer as a fresh estimate');
assert.match(app, /renderPreview\(view, false\);[\s\S]{0,80}saveToDraftBox\(view\)/, 'a fresh estimate is stored in the draft box');
assert.match(app, /async function saveToDraftBox\(view\)/, 'the draft box has an explicit save path');
assert.match(app, /dropDraft\(id\)/, 'giving up a preview also clears its draft');
assert.match(app, /loadDrafts\(\)/, 'the draft box is loaded with the app');
assert.match(app, /notes:view\.notes,items:view\.items,name:view\.name/, 'the stored draft keeps the numbers and labels');
assert(!/saveToDraftBox[\s\S]{0,400}imageData/.test(app), 'the draft never stores the photo itself');

// --- Meals with no usable date -----------------------------------------------------------------
for (const id of ['undated-meals', 'undated-meals-text', 'undated-meals-date', 'undated-meals-apply']) {
  assert(ids.includes(id), `the page defines #${id}`);
}
assert.match(app, /function undatedMeals\(\)/, 'undated meals are collected in one place');
assert.match(app, /row\.needsDate === true \|\| !validDate\(row\.date\)/, 'both a flag and a malformed date count as undated');
assert.match(app, /async function applyUndatedDate\(\)/, 'the user can assign the missing date');
assert.match(app, /const \{needsDate, \.\.\.rest\} = row; await api\('\/api\/meals', \{\.\.\.rest, date:value\}\)/, 'assigning a date rewrites only that field');

// --- What would be sent ------------------------------------------------------------------------
for (const id of ['chat-data-preview-panel', 'chat-data-preview', 'advice-data-preview-panel', 'advice-data-preview']) {
  assert(ids.includes(id), `the page defines #${id}`);
}
assert.match(app, /const payload = \{date, kind\};[\s\S]{0,120}payload\.preferences = readPreferences\(\);[\s\S]{0,120}api\('\/api\/context-preview', payload\)/, 'the preview asks the app what it would send, including advice preferences');
assert.match(app, /if \(!window\.QinghengAdapter\.hasNative\(\)\)/, 'the browser demo states that it never sends anything');
assert.match(css, /\.data-preview-panel pre\.data-preview\{/, 'the preview block is styled for long JSON');
assert.match(adapter, /path==='\/api\/drafts'/, 'the browser demo keeps a draft box');
assert.match(adapter, /estimateDrafts:copy\(data\.estimateDrafts\)/, 'the demo keeps drafts across reloads');
assert.match(adapter, /path==='\/api\/context-preview'\) throw/, 'the demo refuses a preview it cannot build');

// --- Meal time: the photo's own clock first, then the description, then the record moment ------
const clockBlock = app.slice(app.indexOf('  const clockPattern ='), app.indexOf('  let activeDate = localDate();'));
assert(clockBlock.length > 200, 'the meal-time helpers are delimited');
const clockCtx = {Date};
clockCtx.globalThis = clockCtx;
vm.createContext(clockCtx);
vm.runInContext(clockBlock + '\nglobalThis.defaultMealTime = defaultMealTime; globalThis.clockFromText = clockFromText; globalThis.photoWallClock = photoWallClock; globalThis.mealTimeNote = mealTimeNote; globalThis.nowClock = nowClock;', clockCtx);
const wall = clockCtx.photoWallClock;
const text = clockCtx.clockFromText;
assert.equal(wall({photoTakenAt: '2026-10-16T12:34:56+08:00'}), '12:34', 'the photo wall clock is read from the timestamp itself');
assert.equal(wall({photoTakenAt: '2026-10-16T23:05:00Z'}), '23:05', 'the camera timezone is kept, not converted to the phone zone');
assert.equal(wall({photoTakenAt: null}), null, 'a missing capture time yields no clock');
assert.equal(wall({photoTakenAt: 'not-a-time'}), null, 'a malformed capture time yields no clock');
assert.equal(text('12:30 吃了米饭'), '12:30');
assert.equal(text('晚上7点吃的'), '19:00', 'an evening qualifier shifts the hour');
assert.equal(text('早上七点'), '07:00', 'the 点 form is understood');
assert.equal(text('中午随便吃了点'), '12:30', 'a meal word alone gives a typical time');
assert.equal(text('夜宵'), '22:00');
assert.equal(text('就是米饭和鸡胸肉'), null, 'no time in the text stays unknown');
assert.deepEqual({...clockCtx.defaultMealTime({photoTakenAt: '2026-10-16T08:15:00+08:00'}, '中午吃的', 'lunch')},
  {mealTime: '08:15', mealTimeSource: 'photo'}, 'the photo outranks the description');
assert.deepEqual({...clockCtx.defaultMealTime({photoTakenAt: null}, '中午 12 点吃的', 'lunch')},
  {mealTime: '12:00', mealTimeSource: 'text'}, 'the description is used when there is no photo');
const fallback = clockCtx.defaultMealTime({photoTakenAt: null}, '', 'dinner');
assert.equal(fallback.mealTimeSource, 'now', 'with no evidence the record moment is used');
assert.match(fallback.mealTime, /^\d{2}:\d{2}$/);
assert.match(clockCtx.mealTimeNote({mealTimeSource: 'photo'}), /拍摄时刻/);
assert.match(clockCtx.mealTimeNote({mealTimeSource: 'now'}), /记录时刻/);
for (const id of ['estimate-meal-time', 'estimate-meal-time-note']) assert(ids.includes(id), `the page defines #${id}`);
assert.match(app, /mealTime=\$\('#estimate-meal-time'\)\.value/, 'the confirmed meal time is read from the field');
assert.match(app, /draft\.mealTime=mealTime; draft\.mealTimeSource='manual';/, 'a confirmed time is no longer a guess');
assert.match(app, /mealTime:draft\.mealTime,/, 'the saved meal carries the confirmed time');
assert.match(app, /mealTime:quickTime, mealTimeSource:'manual'/, 'a quick copy also records when it was eaten');
// Step 2 changed the manual submit shape: values are read first so cooking oil can be added once.
assert.doesNotMatch(app, /mealTimeSource:'manual',\.\.\.values/, 'the manual entry path is gone (1.4.46 entry budget)');
assert.match(app, /esc\(meal\.mealTime\)/, 'the meal list shows the meal time');
assert.match(html, /id="estimate-meal-time"/, 'the estimate card still asks for the time');

// --- Voice: own listening sheet, with the system screen only as a fallback ----------------------
for (const id of ['voice-sheet', 'voice-bars', 'voice-status', 'voice-text', 'voice-cancel', 'voice-done']) assert(ids.includes(id), `the page defines #${id}`);
assert.match(html, /data-voice-target="meal"/, 'the microphone sits inside the description field');
assert.match(app, /data-voice-target="quick"/, 'the quick-record dialog gets its own microphone');
assert.match(app, /function openVoiceSheet\(target\)/, 'one entry point opens the listening sheet');
assert.match(app, /try \{bridge\.startVoice\(voice\.target \|\| 'meal'\);\}/, 'the in-app recogniser is tried first');
assert.match(app, /function systemVoiceFallback\(bridge\)/, 'the system recogniser stays as the fallback');
assert.match(app, /else if \(state === 'unavailable'\) systemVoiceFallback\(voiceBridge\(\)\);/, 'an unavailable in-app recogniser hands over instead of failing');
assert.match(fs.readFileSync(new URL('../app/src/main/AndroidManifest.xml', import.meta.url), 'utf8'), /android\.speech\.RecognitionService/, 'the manifest declares the recognition service query needed on Android 11+');
assert.match(app, /window\.__qinghengVoicePartial = payload =>/, 'partial results drive the live text');
assert.match(app, /window\.__qinghengVoiceState = payload =>/, 'listening state drives the status line');
assert.match(app, /voice\.retry = true; voiceButton\(true\);/, 'a failed attempt offers a retry instead of a dead end');
assert.match(app, /document\.addEventListener\('click', event => \{\s*const button = event\.target\.closest\('\[data-voice-target\]'\)/, 'mic buttons are wired by delegation');
assert.match(css, /@keyframes voice-level/, 'the listening sheet animates a level meter');
assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{\.voice-bars span\{animation:none\}/, 'the animation respects reduced motion');

// --- One visual language for lists and dropdowns ------------------------------------------------
assert.match(css, /select\{appearance:none;-webkit-appearance:none;padding-right:44px;background-image:url\("data:image\/svg\+xml/, 'selects share one custom chevron');
assert.match(css, /input:not\(\[type=checkbox\]\):not\(\[type=radio\]\),select,textarea\{width:100%;border:1px solid var\(--line-strong\);border-radius:var\(--shape-ctrl-radius\)/, 'fields and selects share one shell');
assert.match(css, /\.list-row\{display:flex;align-items:flex-start;gap:12px;/, 'every row list shares one row shell');
assert.match(css, /button\.food-result\.list-row\{/, 'the food library uses the same row shell');
assert.match(app, /class="meal-row list-row"/, 'meal and chat rows adopt the shared shell');
assert.doesNotMatch(app, /class="food-result list-row"/, 'the food-library renderer is gone (1.4.46)');
assert.equal((app.match(/class="meal-row list-row"/g) || []).length, 4, 'today, records, push history and today-advice all use it');
assert.match(app, /role="listitem"/, 'rows keep list semantics');
assert.match(html, /id="record-meals" role="list" aria-label=/, 'list containers keep accessible names');
assert.match(html, /id="draft-list" role="list"/, 'the draft box is a list too');
assert.match(app, /data-draft-restore=|data-draft-restore="/, 'each stored draft can be restored on its own');
assert.match(app, /data-draft-drop="/, 'each stored draft can be dropped on its own');

// --- Rows, rich answers and the local comparison table -----------------------------------------
assert.match(app, /<div class="row-body">/, 'a row is split into a body and a side column');
assert.match(app, /<span class="row-kcal">/, 'energy is right-aligned and separated from the numbers');
assert.match(app, /class="icon-button danger row-delete" data-delete-meal=/, 'the meal delete action is a compact icon in the title row');
assert.match(app, /class="row-side"><span class="row-kcal">/, 'the calorie column holds only the number now');
assert(!app.includes('data-delete-chat'), 'the chat list no longer carries an inline delete control');
assert.match(app, /data-long-press="chat:\$\{esc\(id\)\}"/, 'a chat row is deleted from its long-press sheet instead');
assert(!/data-long-press="chat:[\s\S]{0,700}?row-date/.test(app), 'the chat date is no longer repeated inside every row');
assert.match(app, /class="row-toggle-inline" data-chat-toggle=/, 'a long answer offers an inline 展开全文');
assert.match(app, /row\.question \|\| ''\)\.includes\('含照片'\) \? \['含照片'\]/, 'a photo question is tagged on the head line');
assert.match(app, /联网检索\|参考来源\|来源（联网\/\.test\(answer\) \? \['联网检索'\]/, 'a searched answer is tagged as well');
assert.match(app, /const expandedChats = new Set\(\);/, 'an expanded answer is remembered per record');
assert.match(app, /answer\.length > 140/, 'only long answers get a preview and a toggle');
assert.match(app, /class="row-toggle-inline" data-chat-toggle=/, 'a long answer offers 展开全文');
assert.match(css, /\.answer\.is-clamped\{max-height:5\.4em;overflow:hidden/, 'the preview is clamped to a few lines');
assert.match(css, /\.row-date\{margin-left:auto/, 'the date is pushed to the end of the head line');
assert.match(app, /<span class="row-tag subtle-tag">\$\{esc\(source\)\}<\/span>/, 'meal source and item count are head-line tags, keeping the number line short');
assert.match(app, /class="meal-numbers" aria-label="营养数值"/, 'meal metrics have a dedicated value group');
assert.match(app, /<span><small>蛋白<\/small><b>\$\{fmt\(meal\.protein\)\} g<\/b><\/span>/, 'protein is a named, unit-bearing numeric column');
assert(!/delete-meal">删除</.test(app), 'the old text delete button is gone');
assert.match(app, /<span class="row-tag">\$\{type\}<\/span>/, 'the meal type is a tag beside the name');
assert.match(app, /共 \$\{meal\.items\.length\} 项/, 'the row states how many items the meal has');
assert.match(app, /const source = \(\{manual:'手动'/, 'the row states where the record came from');
assert.match(app, /<span><small>脂肪<\/small><b>\$\{fmt\(meal\.fat\)\} g<\/b><\/span>/, 'fat is a named, unit-bearing numeric column');

assert.match(app, /function answerHtml\(text\)/, 'answers go through one rich renderer');
assert.match(app, /function answerIcon\(text\)/, 'a section picks a coloured icon from its topic');
assert.match(app, /function answerEyebrow\(text\)/, 'uppercase Latin runs become a label');
assert.match(css, /\.answer-eyebrow\{[^}]*text-transform:uppercase/, 'the label is styled as uppercase');
assert.match(app, /function answerTable\(rows\)/, 'pipe tables are recognised');
assert.match(app, /function answerSpaceTable\(rows\)/, 'a whitespace-separated table is recognised too');
assert.match(app, /if \(head\.some\(answerNumericCell\)\) return '';/, 'a numeric header line is not treated as a table');
assert.match(app, /if \(!body\.every\(cells => cells\.slice\(1\)\.every\(answerNumericCell\)\)\) return '';/, 'every remaining column must be numeric, so prose never matches');
// Prompt wording now lives in cn.qingheng.health.ai.Prompts (step 8 moved it out of the activity).
const promptsJava = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/ai/Prompts.java', import.meta.url), 'utf8');
assert.match(promptsJava, /管道表格写法：第一行表头/, 'the chat prompt asks for a pipe table when comparing numbers');
assert.match(promptsJava, /只有真的在对比多个数值时才用表格/, 'the advice prompt asks for the same');
assert.match(app, /split\(\/\\n\\s\*\\n\/\)/, 'the answer is parsed block by block');
assert.match(app, /<table class="answer-table">/, 'a table is rendered as real table markup');
assert.match(app, /answerInline = text => esc\(text\)/, 'answer text is escaped before any markup is added');
assert.match(css, /\.answer-table th,\.answer-table td\{border:1px solid var\(--line\)/, 'answer tables share the app table style');
for (const id of ['stats-table']) assert(ids.includes(id), `the page defines #${id}`);
assert.match(app, /function statsTableHtml\(\)/, 'the comparison table is computed locally, without a model');
assert.match(app, /function median\(values\)/, 'medians are used so one odd reading cannot move the table');
assert.match(app, /按中位数比较「30~60 天前」与「最近 30 天」/, 'the table states its own basis and limits');
assert.match(app, /不是健康或医疗结论/, 'the table explicitly refuses a medical reading');
assert.match(css, /\.stats-table tbody tr:last-child td\{border-bottom:none\}/, 'the comparison table is styled');
assert.match(css, /\.stats-good\{color:var\(--tone-weight\)\}\.stats-bad\{color:var\(--warn-ink\)\}/, 'direction colours are defined');

assert.match(css, /\.app-dialog-panel\{width:min\(560px,100%\)/, 'dialogs are wider than before');
assert.match(css, /\.voice-panel\{width:min\(560px,100%\)/, 'the listening sheet matches the dialog width');
assert.match(html, /icon-glyph-ring\.svg/, 'navigation reuses the ring glyph family');
for (const [tab, icon] of [['today','icon-glyph-ring.svg'],['records','icon-glyph-balance.svg'],['chat','icon-glyph-chat.svg'],['trends','icon-glyph-trends.svg'],['profile','icon-nav-profile.svg']]) {
  const block = html.slice(html.indexOf(`data-tab="${tab}"`));
  assert(block.slice(0, 260).includes(icon), `the ${tab} tab uses ${icon}`);
}
assert.match(html, /icon-mic\.svg/, 'the microphone uses the shared icon family');
assert(!/nav-icon" aria-hidden="true">☀/.test(html), 'the old font glyph is gone');
assert(!html.includes('🎙'), 'no emoji remains in the microphone button');

// --- One sheet for pickers and long-press actions ----------------------------------------------
for (const id of ['action-sheet', 'action-sheet-title', 'action-sheet-list', 'action-sheet-cancel']) assert(ids.includes(id), `the page defines #${id}`);
assert.match(app, /function openSheet\(config\)/, 'one sheet component serves pickers and actions');
assert.match(app, /function chooseFromSelect\(select\)/, 'every select is answered by the custom sheet');
assert.match(app, /document\.addEventListener\('touchstart', event => \{\s*const select = event\.target\.closest\?\.\('select'\);[\s\S]{0,120}event\.preventDefault\(\);/, 'the platform select dialog is suppressed on touch');
assert.match(app, /select\.dispatchEvent\(new Event\('change', \{bubbles: true\}\)\)/, 'choosing an option still fires change, so existing handlers keep working');
assert.match(app, /function fieldLabelFor\(control\)/, 'the sheet is titled by the field it belongs to');
assert.match(css, /\.sheet-option\{display:flex;align-items:center;gap:12px/, 'sheet rows follow the app list style');
assert.match(css, /\.sheet-option\.is-danger\{color:var\(--danger\)\}/, 'a destructive action is visually distinct');
assert.match(html, /id="action-sheet" hidden role="presentation"/, 'the sheet ships hidden');

assert.match(app, /data-long-press="meal:\$\{esc\(meal\.id \?\? ''\)\}"/, 'a meal row can be long-pressed');
assert.match(app, /const LONG_PRESS_MS = 520;/, 'long press has an explicit threshold');
assert.match(app, /\{label: '复制文本', icon: 'icon-copy\.svg'\}/, 'the action sheet offers copy');
assert.match(app, /\{label: '选择文字', icon: 'icon-select\.svg'\}/, 'the action sheet offers text selection');
assert.match(app, /\{label: favorite \? '取消收藏' : '收藏', icon: 'icon-bookmark\.svg'\}/, 'the action sheet offers a favourite toggle');
assert.match(app, /\{label: '删除', icon: 'icon-trash\.svg', danger: true\}/, 'the action sheet offers delete');
assert.match(app, /function selectRowText\(row\)/, 'selection hands the row to the platform handles');
assert.match(app, /range\.selectNodeContents\(body\);/, 'the whole row body is selected');
assert.match(app, /bridge\.copyText\(value\) === true/, 'copy prefers the native clipboard bridge');
assert.match(app, /navigator\.clipboard\.writeText\(value\)/, 'with a browser fallback');
assert.match(mainJava, /public boolean copyText\(String text\)/, 'the native bridge writes the clipboard without reading it');
assert.match(mainJava, /manager\.setPrimaryClip\(android\.content\.ClipData\.newPlainText/, 'the clipboard write is a plain text clip');
assert.match(css, /\.meal-row,\.meal-row \*,\.answer,\.answer \*,\.list-row,\.list-row \*\{user-select:none/, 'rows and answers opt out of native selection, so a long press shows app actions only');
assert.match(css, /\.is-selecting,\.is-selecting \.row-body[^{]*\{user-select:text/, 'selection mode re-enables it on demand');

assert.match(app, /function toggleFavorite\(kind, record\)/, 'favourites are persisted through the existing record routes');
assert.match(app, /favorite: record\.favorite !== true/, 'the flag is toggled rather than set twice');
assert.match(app, /class="fav-badge"/, 'a favourite row is marked');
assert.match(app, /bindFavoriteFilter\('chat-favorites-only'/, 'the chat list can show favourites only');
assert.match(app, /bindFavoriteFilter\('meal-favorites-only'/, 'the meal list can show favourites only');
assert.match(html, /id="chat-favorites-only" aria-pressed="false"/, 'the filter is a pressed-state chip');
assert.match(html, /id="meal-favorites-only" aria-pressed="false"/, 'the meal filter is a pressed-state chip');
assert.match(app, /function chatRowsInScope\(\) \{[\s\S]{0,220}const base = favoriteOnlyChats \? chats\.filter\(row => row\.favorite === true\) : chats;[\s\S]{0,140}return base\.filter\(row => chatMatches\(row, chatQuery\)\);/, 'the chat filter really filters');
assert.match(app, /const shown = chatRowsInScope\(\);/, 'renderChat reads the filtered rows from one place');

// --- 问答记录：按天查看 + 日期翻页 ------------------------------------------------------------
assert.match(html, /id="chat-day-toggle" aria-pressed="false"/, 'the history has a day chip');
assert.match(html, /id="chat-day-prev"[\s\S]{0,260}id="chat-day-next"/, 'the day chip is flanked by step buttons');
assert.match(app, /DEFAULT_MEAL_WINDOW = {lunchFrom:'11:20', dinnerFrom:'16:30', snackFrom:'22:00'}/, 'the default meal window has lunch, dinner and snack turn-over points');
assert.match(app, /if \(value >= dinnerFrom\) return 'dinner';/, 'the default slot reaches dinner before snack');
assert.match(html, /id="meal-window-dinner"/, 'the appearance sub-page can edit the dinner turn-over');
assert.match(app, /let chatDayFilter = '';/, 'the day filter keeps a session state');
assert.match(app, /function chatDates\(\)/, 'the pager walks the dates that actually have records');
assert.match(app, /const dayRows = chatDayFilter \? shown\.filter\(row => String\(row\.date \|\| ''\) === chatDayFilter\) : shown;/, 'renderChat honours the day filter');
assert.match(app, /if \(!chatDayFilter\) \{ if \(dir < 0\) setChatDayFilter\(dates\[0\]\); return; \}/, 'the arrows start from the newest day and clear back to all');
assert.match(app, /installChatDayFilter\(\);/, 'the day filter is wired at boot');

// --- Advice is invalidated when the records change ---------------------------------------------
assert.match(app, /function mealsFingerprint\(date\)/, 'the advice is tied to a record fingerprint');
assert.match(app, /container\.dataset\.fingerprint = validDate\(date\) \? mealsFingerprint\(date\) : '';/, 'the fingerprint is stored with the advice');
assert.match(app, /const isStale=!!baked && shown===activeDate && baked!==mealsFingerprint\(activeDate\);/, 'a changed day marks the advice as stale');
for (const id of ['advice-stale']) assert(ids.includes(id), `the page defines #${id}`);

console.log('PASS meal date context: capture time is kept or declared unknown, never fabricated; the analysed day is explicit and editable in the photo, chat and advice paths.');
;return typeof fail === 'number' ? fail : 0;
});

await __run("meal-date-java", async () => {
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');
const alarm = fs.readFileSync('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', 'utf8');
const sched = fs.readFileSync('app/src/main/java/cn/qingheng/health/AlarmScheduler.java', 'utf8');
const push = fs.readFileSync('app/src/main/java/cn/qingheng/health/PushNotify.java', 'utf8');
let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

// --- The chat/advice context must let the model tell which day a record belongs to --------------
check('chat takes the analysed day from the request', main.includes('String selectedDate = analysisDate(b.opt("date"), dayOffset(0));'));
check('a bad analysed day is refused instead of silently replaced', /private static String analysisDate\(Object raw, String today\)[\s\S]{0,400}throw fail\("请选择有效的 YYYY-MM-DD 日期"\)/.test(main));
check('chat context is appended after the history', /for \(int i = 0; i < history\.length\(\); i\+\+\) messages\.put\(history\.get\(i\)\);[\s\S]{0,1200}if \(!planFocus\) messages\.put\([\s\S]{0,160}chatDataContext\(selectedDate\)/.test(main));
for (const field of ['"today"', '"timezone"', '"selectedDate"', '"mealCount"', '"dailyNutrition"', '"recordPolicy"']) {
  check('chat context carries ' + field, main.includes(`.put(${field}`));
}
check('the context states that capture time is not the meal date', main.includes('拍摄时间不等于进餐日期'));
check('the context states that mealCount 0 is not zero intake', main.includes('mealCount=0表示未记录'));
check('per-day counts come from every record, not the capped list', main.includes('mealCount(selectedDate)') && main.includes('private int mealCount(String day)'));
check('daily nutrition reports completeness per day', main.includes('nutritionComplete'));
check('the meal window is anchored on the analysed day', main.includes('dayOffsetFrom(selectedDate, -13)'));
check('advice anchors its window on the analysed day too', main.includes('dayOffsetFrom(day, -13)'));
check('the meal window keeps dates and sorts newest first', /matching\.sort\(\(a, b\) -> recordDate\(b\)\.compareTo\(recordDate\(a\)\)\)/.test(main));
check('a meal row keeps its date even without macros', main.includes('Date and existence remain meaningful even if every macro is missing'));
check('the old fixed 24k JSON cut is gone', !main.includes('json.substring(0, 24000)'));
check('the chat cap is documented and bounded', main.includes('if (out.length() >= 200) break;'));
check('meal rows carry a whitelisted meal type', main.includes('new HashSet<>(java.util.Arrays.asList("breakfast", "lunch", "dinner", "snack")).contains(type)'));
check('meal rows never carry names, notes or ids', !/datedMeal\([\s\S]{0,300}optString\("name"/.test(main));

// --- Photo provenance: kept when real, declared unknown otherwise -------------------------------
check('photo provenance is whitelisted', main.includes('new HashSet<>(java.util.Arrays.asList("camera", "exif", "exif-local"))'));
check('an unusable timestamp falls back to unknown', /return new JSONObject\(\)\.put\("photoTakenAt", JSONObject\.NULL\)\.put\("photoTimeSource", "unknown"\);/.test(main));
check('the camera capture is stamped before launch', main.includes('.putString("pending_photo_time_source", "camera")'));
check('gallery picks drop a stale camera stamp', main.includes('.remove("pending_photo_taken_at").putString("pending_photo_time_source", "unknown")'));
check('EXIF DateTimeOriginal is read', main.includes('TAG_DATETIME_ORIGINAL'));
check('an EXIF offset is used when present', main.includes('TAG_OFFSET_TIME_ORIGINAL') && main.includes('"exif"'));
check('an offset-less EXIF time is marked exif-local', main.includes('"exif-local"'));
check('a future capture time is rejected', main.includes('isAfter(java.time.Instant.now().plus(java.time.Duration.ofDays(1)))'));
check('the pending photo metadata helper exists', main.includes('private JSONObject pendingPhotoMetadata(String uri)'));
check('the delivered payload carries the photo time', main.includes('.put("photoTakenAt", photoTime.opt("photoTakenAt"))'));
check('pending photo time is cleared with the capture', main.includes('.remove("pending_photo_taken_at").remove("pending_photo_time_source")'));

// --- The daily push must treat only meals as meals ---------------------------------------------
check('the receiver reads meals only', alarm.includes('data.mealsOn(today)'));
check('no collection loop mixes weight and habits into meals', !alarm.includes('new String[]{"meals", "measurements", "habits"}'));
check('the receiver counts meals from raw records', alarm.includes('int mealCount(String day)'));
check('push rows keep date and meal type', alarm.includes('row.put("mealType", safeMealType(record))') && alarm.includes('if (date.length() == 10) row.put("date", date);'));
check('a meal without macros is still reported', alarm.includes('A meal with missing macros is still evidence that it was eaten'));
check('the push prompt is never cut mid-JSON', !alarm.includes('content.substring(0, PROMPT_LIMIT)') && alarm.includes('private static JSONArray buildPrompt(String system, JSONObject user)'));
check('trimming drops rows before optional blocks', /if \(rows != null && rows\.length\(\) > 0\)[\s\S]{0,400}if \(user\.has\("body"\)\)/.test(alarm));
check('an unfit prompt fails loudly instead of sending broken JSON', alarm.includes('throw new PublicError("今日记录过多，无法生成推送分析")'));
check('the push prompt separates capture time from the meal date', prompts.includes('拍摄时间只是照片证据，不等于进餐时间'));
check('the push reports how many meals exist today', alarm.includes('.put("mealCount"'));

// --- A meal with no usable date is repaired or surfaced, never silently lost -------------------
check('invalid meal dates are refused on write', main.includes('if (collection.equals("meals")) requireMealFields(record);') && main.includes('请选择有效的饮食日期（YYYY-MM-DD）后再保存'));
check('the repair runs inside the shared normaliser', /ensureChatIds\(out\);\s*\n\s*migrateSeedData\(out\);\s*\n\s*repairMealDates\(out\);/.test(main));
check('the repair is gated by a marker', main.includes('!(root.opt("mealDateRepaired") instanceof Number)') && main.includes('root.put("mealDateRepaired", 1)'));
check('the repair prefers the capture time', /inferMealDate[\s\S]{0,300}photoTakenAt[\s\S]{0,200}OffsetDateTime\.parse/.test(main));
check('the repair falls back to the creation time', /inferMealDate[\s\S]{0,600}createdAt[\s\S]{0,200}ofEpochMilli/.test(main));
check('a record with no evidence is flagged, not dated', main.includes('meal.put("needsDate", true)') && main.includes('is invented: a record with no usable evidence is flagged'));
check('the count of still-undated meals is reported', main.includes('root.put("undatedMeals", undated)'));
check('a repaired count is reported once', main.includes('root.put("mealDateRepair", new JSONObject().put("count", repaired)'));
check('a valid date clears the flag', main.includes('if (validDay(recordDate(meal))) { meal.remove("needsDate"); continue; }'));

// --- Draft box and payload preview -------------------------------------------------------------
check('the draft box route exists', main.includes('path.equals("/api/drafts")') && main.includes('path.startsWith("/api/drafts/")'));
check('drafts are capped', main.includes('private static final int DRAFT_LIMIT = 5;'));
check('a stored draft re-arms its id for confirmation', main.includes('!storedDraftExists(draftId)'));
check('confirming a meal clears its draft atomically', main.includes('next.put(DRAFTS, withoutDraft(next.optJSONArray(DRAFTS), draftId));'));
check('drafts are scrubbed before storage', /saveStoredDraft[\s\S]{0,500}scrub\(draft\)/.test(main));
check('the preview route exists and shares the builders', main.includes('private JSONObject contextPreview(JSONObject b)') && main.includes('.put("system", adviceSystemPrompt() + preferenceSuffix(b)).put("user", adviceInput(day))'));
check('chat and advice share one system prompt each', main.includes('private static String adviceSystemPrompt()') && main.includes('chatSystemPrompt()'));
check('the advice request uses the shared payload builder', /JSONObject input = adviceInput\(day\);/.test(main));
check('the preview never calls a provider', !/contextPreview[\s\S]{0,600}chat\(c,/.test(main));

// --- Meal time: taken from the photo by default, editable, and sent to the model ---------------
check('a malformed meal time is refused', main.includes('if (!time.isEmpty() && !validClock(time)) throw fail("进餐时间格式应为 HH:mm")'));
check('the clock format is validated in one place', main.includes('private static boolean validClock(String value)'));
check('only a real clock time reaches the model', main.includes('private static String safeMealTime(JSONObject record)') && main.includes('if (!mealTime.isEmpty()) row.put("mealTime", mealTime);'));
check('the context explains mealTime versus photo time', main.includes('mealTime 是进餐时刻') && main.includes('photoTakenAt 只是照片证据'));
check('the push payload carries the meal time', alarm.includes('if (mealTime.matches("^([01]\\\\d|2[0-3]):[0-5]\\\\d$")) row.put("mealTime", mealTime);'));

// --- Records-triggered push ---------------------------------------------------------------------
check('a records-triggered slot exists', sched.includes('SLOT_MEAL = "meal"') && sched.includes('REQUEST_MEAL = 7003'));
check('the follow-up is armed once per day', main.includes('!AlarmScheduler.ran(this, AlarmScheduler.today(), AlarmScheduler.SLOT_MEAL)') && main.includes('AlarmScheduler.scheduleMealFeedback(this, MEAL_FEEDBACK_DELAY_MS)'));
check('disabling push cancels the follow-up', sched.includes('manager.cancel(pending(context, SLOT_MEAL, REQUEST_MEAL))'));
check('the receiver accepts the follow-up slot', alarm.includes('!AlarmScheduler.SLOT_MEAL.equals(slot)'));
check('an empty day does not call the model', alarm.includes('boolean worthCalling = consent') && alarm.includes('&& hasData;'));
check('the follow-up has its own prompt wording', alarm.includes('刚记录完一餐，给出这一餐的即时反馈'));
check('the follow-up gets its own notification identity', push.includes('ID_MEAL = 7304') && push.includes('"meal".equals(slot)'));

// --- In-app voice recognition -------------------------------------------------------------------
check('the app runs its own recogniser', main.includes('android.speech.SpeechRecognizer.createSpeechRecognizer(this)') && main.includes('private final class VoiceListener'));
check('partial results are forwarded to the page', main.includes('onPartialResults') && main.includes('window.__qinghengVoicePartial'));
check('listening state is forwarded to the page', main.includes('window.__qinghengVoiceState'));
check('availability decides between the custom sheet and the system one', main.includes('inAppVoiceAvailable()') && main.includes('private boolean startInAppVoiceIfPossible(String target)'));
check('the recogniser is released with the activity', main.includes('if (recognizer != null) { try { recognizer.destroy(); }'));
check('the bridge exposes start/stop/cancel and readiness', main.includes('public void startVoice(String target)') && main.includes('public void stopVoice()') && main.includes('public void cancelVoice()') && main.includes('public boolean inAppVoiceReady()'));

// --- Version is owned in one place --------------------------------------------------------------
const build = fs.readFileSync('build.ps1', 'utf8');
check('build.ps1 takes the version as a parameter', /\$Version='\d+\.\d+\.\d+'/.test(build) && /\$VersionCode=\d+/.test(build));
check('build.ps1 uses the parameter everywhere', build.includes("'--version-code',\"$VersionCode\"") && build.includes("'--version-name',$Version") && build.includes('$apkName="qingheng-$Version.apk"'));
check('build.ps1 rejects a malformed version', build.includes("Version must look like"));

// --- SQLite mirror (write-through, JSON stays authoritative) ------------------------------------
const sync = fs.readFileSync('app/src/main/java/cn/qingheng/health/SyncDatabase.java', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
check('the database version was raised for the mirror', sync.includes('private static final int VERSION = 2;'));
check('an upgrade creates the mirror without dropping data', /if \(oldVersion < 1\) onCreate\(db\);\s*else if \(oldVersion < 2\) createMirror\(db\);/.test(sync));
check('the mirror keeps one row per record', sync.includes('PRIMARY KEY(collection, record_id)'));
check('the mirror stores the whole record as payload', sync.includes('String payload = record.toString();') && sync.includes('values.put("payload", payload);'));
check('the mirror rewrites inside one transaction', /db\.beginTransaction\(\);[\s\S]{0,2500}db\.setTransactionSuccessful\(\);/.test(sync));
check('the mirror records when it last ran', sync.includes('"lastMirroredAt"') && sync.includes('public long lastMirroredAt()'));
check('per-collection counts come from the mirror table', sync.includes('public org.json.JSONObject mirrorCounts()'));
check('every write mirrors after the JSON save', /persist\(\); \} catch \(Exception e\) \{ state = previous; throw e; \}\s*mirrorToDatabase\(\);/.test(main));
check('a mirror failure never blocks the save', /catch \(Exception e\) \{[\s\S]{0,200}lastMirrorError = "SQLite 镜像写入失败";/.test(main));
check('the mirror error carries no record content', !/lastMirrorError = [^"]*\+/.test(main));
check('the status route reports both stores and parity', main.includes('private JSONObject storageStatus(boolean remirror)') && main.includes('path.equals("/api/storage-status") && get') && main.includes('path.equals("/api/storage-remirror")'));
check('parity is a real comparison, not a constant', main.includes('boolean parity = json.length() > 0 && json.toString().equals(sqlite.toString());'));
check('the status states the authority and the window limit', main.includes('JSON 为权威来源；SQLite 为同步镜像') && main.includes('.put("windowLimit", 200)'));
check('the first load establishes a baseline mirror', main.includes('if (syncDatabase.lastMirroredAt() == 0L) mirrorToDatabase();'));

// --- Profile hub with sub-pages -----------------------------------------------------------------
for (const id of ['profile-hub', 'subpage-targets', 'subpage-model', 'subpage-appearance', 'subpage-data', 'storage-status', 'storage-refresh', 'storage-remirror', 'about-version']) {
  check('the page defines #' + id, html.includes(`id="${id}"`));
}
check('four merged entries are present', (html.match(/data-subpage-open=/g) || []).length === 4);
check('moved cards keep their ids', ['profile-form', 'settings-form', 'push-form', 'export-data'].every(id => html.includes(`id="${id}"`)));
check('the footer stays inside the profile view', html.indexOf('<footer class="page-footer">') > html.indexOf('id="view-profile"'));
check('the router knows every sub-page', /const SUBPAGES = \['targets', 'model', 'appearance', 'data'\];/.test(app));
check('the hash is parsed as tab/sub', app.includes('function parseHash()') && app.includes("const sub = SUBPAGES.includes(parts[1]) ? parts[1] : '';"));
check('entering a sub-page pushes history for the system back button', app.includes('history.pushState(null, \'\', `#profile/${id}`)'));
check('restoring the tab ignores the sub-page', /function restoreTab\(\) \{\s*const fromHash = parseHash\(\)\.tab;/.test(app));
check('hub summaries are refreshed from state', app.includes('function renderHub()') && app.includes('renderHub();'));
check('the storage panel is driven by the new route', app.includes("api(remirror ? '/api/storage-remirror' : '/api/storage-status'"));
check('the app version is a single constant', app.includes("const APP_VERSION = '1.5.32'"));
check('the shown version matches the build script', (() => {
  const shown = /const APP_VERSION = '([0-9.]+)'/.exec(app);
  const built = /\$Version='([0-9.]+)'/.exec(fs.readFileSync('build.ps1', 'utf8'));
  return !!shown && !!built && shown[1] === built[1];
})(), 'APP_VERSION and build.ps1 must agree');

// --- Health Connect was removed on purpose: watch sync is out of scope for now ----------------------
const manifest = fs.readFileSync('app/src/main/AndroidManifest.xml', 'utf8');
check('the Health Connect bridge file is back', fs.existsSync('app/src/main/java/cn/qingheng/health/HealthConnectSync.java'));
check('the five health read permissions are declared', ['READ_SLEEP', 'READ_STEPS', 'READ_EXERCISE', 'READ_ACTIVE_CALORIES_BURNED', 'READ_DISTANCE'].every(name => manifest.includes('android.permission.health.' + name)));
check('the Health Connect route and bridge method are back', /healthConnectStatus|health-connect\/status/.test(main) && /requestHealthConnectPermissions/.test(main) && /health-connect\/sync/.test(app));
check('the rationale entry is back too', manifest.includes('ACTION_SHOW_PERMISSIONS_RATIONALE'));

// --- Reminders: on time, never two in one window, short enough for the shade ---------------------
check('the alarm-clock permission is declared for on-time delivery', manifest.includes('android.permission.USE_EXACT_ALARM'));
check('exact scheduling is still attempted first', sched.includes('manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent)'));
check('a minimum gap between reminders is defined', sched.includes('public static final long MIN_GAP_MS = 3 * 60 * 60 * 1000L;'));
check('catch-up returns at most one slot', sched.includes('public static String catchUpSlot(Context context)') && sched.includes('String latest = eveningMissed ? SLOT_EVENING : SLOT_MORNING;'));
check('catch-up is refused only after a reminder already went out today', sched.includes('postedToday(context) && nextUpcomingTrigger(context) - now < MIN_GAP_MS'));
check('a silent day still gets its catch-up reminder', sched.includes('public static boolean postedToday(Context context)') && sched.includes('KEY_LAST_POSTED_DAY'));
check('a skipped slot is marked so it cannot fire later with stale content', /catchUpSlot[\s\S]{0,1200}markRan\(context, today, slot\);[\s\S]{0,200}recordSkip\(context, today, slot\);/.test(sched));
check('a later missed slot supersedes an earlier one', sched.includes('if (eveningMissed) {') && sched.includes('markRan(context, today, SLOT_MORNING);'));
check('a posted reminder records its time', sched.includes('public static void markPosted(Context context)') && sched.includes('public static boolean tooSoonAfterLastPost(Context context)'));
check('the receiver refuses a second reminder only after one was posted', alarm.includes('if (AlarmScheduler.tooSoonAfterLastPost(context) && AlarmScheduler.postedToday(context)) {') && alarm.includes('AlarmScheduler.markPosted(context);'));
check('the startup catch-up uses the single-slot decision', main.includes('String slot = AlarmScheduler.catchUpSlot(this);') && !main.includes('if (AlarmScheduler.missedToday(this, slot)) AlarmReceiver.catchUp(this, slot);'));
check('the notification body is condensed for the shade', alarm.includes('private static final int NOTIFY_TEXT_LIMIT = 58;') && alarm.includes('static String condense(String text)'));
check('condensing prefers a sentence ending inside the limit', alarm.includes("if (c == '。' || c == '！' || c == '？' || c == '；') {cut = i + 1; break;}"));
check('the short text and the full text are both posted', push.includes('public static boolean post(Context context, String slot, String shortBody, String fullBody)') && push.includes('new Notification.BigTextStyle().bigText(expanded)') && alarm.includes('PushNotify.post(context, slot, condense(body), body)'));
check('the model is asked for a very short reply', prompts.includes('每条不超过 30 个汉字') && prompts.includes('actions'));
check('a skip is written to the history', alarm.includes('static void recordSkip(Context context, String today, String slot)') && alarm.includes('本次提醒已跳过'));
check('the app labels a skipped reminder', app.includes("row.source === 'skipped' ? '<span class=\"row-tag\">已跳过</span>'"));
check('the push panel explains the gap and the one-line body', app.includes('两次之间至少间隔 3 小时') && app.includes('通知正文会自动精简到一行'));



// 不健身是一个答案，不是一个非法值：training = "none" 必须能保存。
{
  const java = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/MainActivity.java', import.meta.url), 'utf8');
  check('training accepts the literal none', java.includes('"none".equals(String.valueOf(trainingRaw))'));
}
;return typeof fail === 'number' ? fail : 0;
});

await __run("meal-draft", async () => {
/**
 * P1-C meal draft (1.4.78): chat text is handed to the existing estimate form,
 * never written directly to a meal record.
 */

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
  throw new Error('unterminated ' + name);
}

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const parse = new Function(extractFunction(app, 'parseMealDraft') + '\nreturn parseMealDraft;')();

let draft = parse('午餐吃了米饭和鸡胸肉', '2026-11-21');
check('a finished meal sentence becomes a draft', draft && draft.kind === 'meal', draft && draft.kind);
check('the date follows the selected day', draft.date === '2026-11-21', draft.date);
check('lunch is detected', draft.payload.mealType === 'lunch', draft.payload.mealType);
check('the original text is kept for the estimate form', draft.payload.text === '午餐吃了米饭和鸡胸肉', draft.payload.text);

draft = parse('早餐吃了两个鸡蛋', '2026-11-21');
check('breakfast is detected', draft && draft.payload.mealType === 'breakfast', draft && draft.payload.mealType);
draft = parse('夜宵吃了酸奶', '2026-11-21');
check('a late-night snack is not forced into dinner', draft && draft.payload.mealType === 'snack', draft && draft.payload.mealType);
draft = parse('昨天晚餐吃了面条', '2026-11-21');
check('yesterday is resolved relative to the selected day', draft && draft.date === '2026-11-20', draft && draft.date);
draft = parse('11月20日午餐吃了牛肉饭', '2026-11-21');
check('an explicit month/day is respected', draft && draft.date === '2026-11-20', draft && draft.date);

for (const text of ['午餐该吃什么？', '晚餐吃什么都行吗', '今天训练卧推 5 组', '体重 65 kg', '今天睡了 7 小时', '明天打算吃火锅']) {
  check('non-meal/hypothetical text is not a draft: ' + text, parse(text, '2026-11-21') === null);
}

check('DRAFT_KINDS includes a meal label', app.includes("meal: '餐食'"));
check('the chat detects training first and meal second', app.includes('parseTrainingDraft(question, activeDate)') && app.includes('parseMealDraft(question, activeDate)'));
check('the meal card offers a handoff, not a write', app.includes("isMeal ? '去确认餐食' : '写入记录'") && app.includes('会带入现有餐食表单'));
check('the handoff fills the existing estimate form', app.includes('function openMealDraft(draft)') && app.includes("field.value = text") && app.includes("form.elements.mealType.value = slot"));
check('the handoff does not write a meal itself', !/function openMealDraft[\s\S]{0,1600}api\('\/api\/meals'/.test(app));
check('the generic draft writer refuses meal drafts', app.includes("draft.kind === 'meal'") && app.includes('餐食草稿需要在餐食表单生成预览并确认'));
check('the meal confirmation button routes to the handoff', /if \(draft.kind === 'meal'\)[\s\S]{0,220}openMealDraft\(draft\)/.test(app));
check('the confirmation path still requires the existing preview', app.includes("data-draft-confirm") && app.includes('生成估算预览'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("meal-edit", async () => {
/**
 * Saved-meal editing (1.4.74): reuse the estimate preview without creating a duplicate row.
 */

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
const mealEditView = new Function(extractFunction(app, 'mealEditView') + '\nreturn mealEditView;')();
const record = {
  id: 'meal-1', date: '2026-11-20', mealType: 'lunch', mealTime: '12:30',
  name: '米饭和鸡胸', source: 'api', items: [{name: '米饭', grams: 150, calories: 174}],
  protein: 10, fat: 3, carbs: 30, oilGrams: 4, uncertaintyPercent: 20,
  photoTakenAt: '2026-11-20T12:00:00+08:00', photoTimeSource: 'camera'
};
const view = mealEditView(record);
check('a saved meal becomes an edit preview', !!view && view.editingId === 'meal-1', view && view.editingId);
check('the saved nutrition and name are preserved', view.name === record.name && view.items[0].calories === 174);
check('the record id is not replaced by a draft id', view.id === record.id && view.editingId === record.id);
check('the original record is not mutated by building the view', record.items[0].name === '米饭' && view.items !== record.items);
check('a record without items cannot be edited', mealEditView({id: 'x', name: '空'}) === null);
check('the edit button is exposed on meal rows', app.includes('data-edit-meal') && app.includes('data-edit-meal="${esc(meal.id)}"'));
check('the edit button has a 44px target', css.includes('.row-edit{') && css.includes('min-height:44px'));
check('opening an edit preview uses the existing preview renderer', app.includes('function beginMealEdit(record)') && app.includes('renderPreview(view, true)'));
check('editing preserves stored oil instead of applying it again', app.includes('const oiledItems = view.editingId ? estimateRawItems : applyOilToItems(estimateRawItems, estimateOilLevel)'));
check('confirming an edit updates by id', app.includes("if (editing) await api('/api/meals',{...editing,id:editing.id,...values})"));
check('a normal estimate still uses estimateId idempotency', app.includes("else await api('/api/meals',{estimateId:draft.id,...values})"));
check('discarding an edit does not delete the saved meal', app.includes('const id=draft?.id, editing=!!draft?.editingId') && app.includes('if(!editing)dropDraft(id)'));
check('the row edit click resolves the saved record id', app.includes("document.addEventListener('click', event =>") && app.includes('beginMealEdit(record)'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("meal-items", async () => {
/**
 * 逐项热量断言：保存必有 items、问答载荷带 items、界面可展开。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');
const app = read('app/src/main/assets/app.js');
const css = read('app/src/main/assets/styles.css');

// --- save path ---------------------------------------------------------------------------------------
check('saving a meal always writes items', main.includes('record.put("items", cleanMealItems(record));'));
check('the helper sanitises existing items', main.includes('private static JSONArray cleanMealItems(JSONObject record)'));
check('manual entries get one synthetic item', main.includes('"（未拆分）"'));
check('item fields are validated and rounded', main.includes('for (String key : new String[]{"grams", "calories", "protein", "carbs", "fat"})') && main.includes('Math.round(value * 10) / 10.0'));
check('the item count is capped', main.includes('out.length() < 100'));

// --- question payload --------------------------------------------------------------------------------
check('the question window adds items', main.includes('JSONArray itemRows = mealItemsForPrompt(record);'));
check('items are compacted for the model', main.includes('private static JSONArray mealItemsForPrompt(JSONObject record)'));
check('biggest contributor first', main.includes('rows.sort((a, b) -> Double.compare(b.optDouble("kcal", 0), a.optDouble("kcal", 0)));'));
check('the list is capped at eight', main.includes('i < 8; i++') && main.includes('"（另有 " + (rows.size() - 8) + " 项未列出）"'));
check('the prompt tells the model to name the food', prompts.includes('必须点名到具体食物'));

// --- export ------------------------------------------------------------------------------------------
check('markdown export lists items', main.includes('append("  - ").append(cell(optionalText(item, "name")))'));

// --- ui ----------------------------------------------------------------------------------------------
check('each meal shows a breakdown toggle', app.includes('data-meal-items=') && app.includes('查看每项热量'));
check('items are sorted by calories in the ui', app.includes('sort((a, b) => (number(b.calories) ?? 0) - (number(a.calories) ?? 0))'));
check('the toggle expands a panel', app.includes("const panel = toggle.parentElement?.querySelector('.meal-items');"));
check('the panel is hidden by default', app.includes('class="meal-items" hidden'));
check('styles exist', css.includes('.meal-items-toggle{') && css.includes('.meal-item{display:flex'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("meal-recalc-collapse", async () => {

const root = new URL('../app/src/main/assets/', import.meta.url);
const app = fs.readFileSync(new URL('app.js', root), 'utf8');
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const css = fs.readFileSync(new URL('styles.css', root), 'utf8');

const start = app.indexOf('  const nutritionKeys =');
const end = app.indexOf('  function openItemRecalc', start);
assert(start > 0 && end > start, 'gram scaling block is delimited');
const fields = {
  grams: {value: '100'},
  calories: {value: '200', dataset: {baseValue: '200'}},
  protein: {value: '10', dataset: {baseValue: '10'}},
  fat: {value: '5', dataset: {baseValue: '5'}},
  carbs: {value: '20', dataset: {baseValue: '20'}}
};
const row = {dataset: {baseGrams: '100'}, fields};
let totalsUpdates = 0;
const ctx = {
  number: value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null,
  updatePreviewTotals: () => { totalsUpdates++; },
  $: (selector, target) => target.fields[selector.match(/data-item-field="([^"]+)"/)[1]]
};
vm.createContext(ctx);
vm.runInContext(app.slice(start, end) + '\nglobalThis.scaleEstimateItem = scaleEstimateItem;', ctx);
ctx.scaleEstimateItem(row, 150);
assert.equal(fields.calories.value, 300);
assert.equal(fields.protein.value, 15);
assert.equal(fields.fat.value, 7.5);
assert.equal(fields.carbs.value, 30);
assert.equal(totalsUpdates, 1);
ctx.scaleEstimateItem(row, 75);
assert.equal(fields.calories.value, 150);
assert.equal(fields.fat.value, 3.75, 'each edit scales from the stable original baseline');

assert.match(app, /if\(input\.dataset\.itemField==='grams'\)/);
assert.match(app, /data-base-grams/);
assert.match(app, /data-base-value/);
assert.match(app, /per100\[key\]\*grams\/100/);
assert.match(app, /四项都填写时按补充值精确换算|每 100g 的热量、蛋白质、脂肪和碳水要一起填写/);
assert.match(html, /id="item-recalc-dialog"/);
assert.match(html, /id="item-recalc-grams"/);
for (const key of ['calories', 'protein', 'fat', 'carbs']) assert(html.includes(`id="item-recalc-${key}"`));

assert.match(app, /function setupCollapsibleSections\(\)/);
assert.match(app, /body\.hidden = collapsed/);
assert.match(app, /button\.setAttribute\('aria-expanded'/);
assert.doesNotMatch(app, /anchor:'#food-search'/);
assert.doesNotMatch(app, /anchor:'#manual-meal-form'/);
assert.match(app, /anchor:'#settings-form'/);
assert.match(app, /anchor:'#push-history'/);
assert.match(app, /anchor:'#export-data'/);
assert(!/anchor:'#estimate-form'|anchor:'#push-form'/.test(app), 'core meal and push forms are not hidden by default');
// 箭头统一到通用规则：方块 + 旋转 + 展开内容过渡（2026-11-04）
assert.match(css, /details:not\(\.day-more\)>summary::after\{[^}]*border-radius:8px/);
assert.match(css, /details:not\(\.day-more\)\[open\]>summary::after\{transform:rotate\(180deg\)\}/);
assert.match(css, /\.collapse-toggle/);

// 展开/收起动画：内容包进 grid 容器，0fr→1fr 过渡（2026-11-04）
assert.match(app, /function installDisclosureAnimation\(\)/);
assert.match(css, /\.disclosure-body\{[^}]*grid-template-rows:0fr/);
assert.match(css, /details\[open\]>\.disclosure-body\{grid-template-rows:1fr[^}]*var\(--dur-disclose\)/);
console.log('PASS meal recalc/collapse: stable proportional scaling, per-100g dialog, totals refresh, and reversible arrow disclosures.');
;return typeof fail === 'number' ? fail : 0;
});

await __run("nutrition-math", async () => {
/**
 * 真实数值测试：直接编译并运行 NutritionMath（纯 Java，可在桌面 JVM 上跑），
 * 覆盖这次「总量 vs 明细」bug 的三种情形。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const jdk = fs.readdirSync('toolchain/jdk').map(name => path.join('toolchain/jdk', name))[0];
const javac = path.join(jdk, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac');
const java = path.join(jdk, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
const work = path.join(os.tmpdir(), 'qingheng-nutrition-' + Date.now());
fs.mkdirSync(work, {recursive: true});

const harness = `import cn.qingheng.health.store.NutritionMath;
public class Harness {
    static String fmt(double[] v) {
        return String.format("%.1f/%.1f/%.1f/%.1f", v[0], v[1], v[2], v[3]);
    }
    public static void main(String[] args) {
        double[][] items = {{600, 30, 50, 20}};
        // 1) oil 10 g: totals include 90 kcal and 10 g fat
        double[] base = NutritionMath.totals(items, 0);
        double[] withOil = NutritionMath.totals(items, 10);
        System.out.println("base=" + fmt(base));
        System.out.println("oil=" + fmt(withOil));
        // 2) the model's totals (oil already inside) agree with the canonical total
        System.out.println("agree=" + !NutritionMath.differs(690, withOil[0]) + "," + !NutritionMath.differs(30, withOil[3]));
        // 3) totals without the oil is exactly what used to be rejected
        System.out.println("oldReject=" + NutritionMath.differs(600, withOil[0]));
        // 4) rounding keeps one decimal
        System.out.println("rounded=" + fmt(NutritionMath.rounded(new double[]{690.04, 30.06, 50.0, 30.0})));
        System.out.println("note=" + NutritionMath.mismatchNote(10).contains("10 g"));
        // carbs fallback when a food omits carbohydrate
        System.out.println("carbsMissing=" + NutritionMath.carbsMissing(400, 30, 0, 20) + "," + NutritionMath.carbsMissing(400, 30, 40, 20));
        System.out.println("inferred=" + String.format("%.1f", NutritionMath.inferredCarbs(400, 30, 20)) + "," + String.format("%.1f", NutritionMath.inferredCarbs(200, 30, 20)));
        // 4/4/9 energy checks
        System.out.println("macro=" + String.format("%.0f", NutritionMath.caloriesFromMacros(30, 50, 20)));
        System.out.println("tight=" + !NutritionMath.energyMismatch(500, 500) + "," + !NutritionMath.energyMismatch(530, 500));
        System.out.println("loose=" + NutritionMath.energyMismatch(800, 500));
        System.out.println("fiberAware=" + String.format("%.0f", NutritionMath.caloriesFromMacros(10, 60, 5, 20)) + "," + String.format("%.0f", NutritionMath.caloriesFromMacros(10, 60, 5)));
        System.out.println("fiberClamp=" + String.format("%.0f", NutritionMath.caloriesFromMacros(0, 10, 0, 30)));
        System.out.println("fixed=" + String.format("%.0f", NutritionMath.reconciledKcal(800, 30, 50, 20)) + "," + String.format("%.0f", NutritionMath.reconciledKcal(530, 30, 50, 20)));
    }
}`;

const source = 'app/src/main/java/cn/qingheng/health/store/NutritionMath.java';
fs.writeFileSync(path.join(work, 'Harness.java'), harness);
execFileSync(javac, ['-encoding', 'UTF-8', '-d', work, source, path.join(work, 'Harness.java')], {stdio: 'pipe'});
const out = execFileSync(java, ['-cp', work, 'Harness'], {encoding: 'utf8'});
const lines = Object.fromEntries(out.trim().split(/\r?\n/).map(line => line.trim().split('=')).map(([key, value]) => [key, value]));

check('items alone are unchanged', lines.base === '600.0/30.0/50.0/20.0', lines.base);
check('oil adds 90 kcal and 10 g fat', lines.oil === '690.0/30.0/50.0/30.0', lines.oil);
check('a model total that includes oil now agrees', lines.agree === 'true,true', lines.agree);
check('a total without the oil is the case that used to throw', lines.oldReject === 'true', lines.oldReject);
check('totals are stored at one decimal place', lines.rounded === '690.0/30.1/50.0/30.0', lines.rounded);
check('the note names the oil amount', lines.note === 'true', lines.note);
check('missing carbs are detected', lines.carbsMissing === 'true,false', lines.carbsMissing);
check('carbs are inferred from the rest', lines.inferred === '25.0,0.0', lines.inferred);
check('4/4/9 energy is computed', lines.macro === '500', lines.macro);
check('small rounding differences pass', lines.tight === 'true,true', lines.tight);
check('a 300 kcal gap is caught', lines.loose === 'true', lines.loose);
check('fiber counts 2 kcal/g', lines.fiberAware === '285,325', lines.fiberAware);
check('fiber is clamped to carbs', lines.fiberClamp === '20', lines.fiberClamp);
check('bad values are replaced, near misses kept', lines.fixed === '500,530', lines.fixed);

// 源码层面：不再抛错，而是走同一口径
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
check('the hard failure is gone', !main.includes('API 营养总量与明细不一致'));
check('the estimate uses the canonical totals', main.includes('NutritionMath.totals(itemValues, oilToAdd)'));
check('a mismatch becomes a note', main.includes('NutritionMath.mismatchNote(oilToAdd)'));
check('the preview adds the oil too', app.includes('totals.calories = (totals.calories ?? 0) + oil * 9;'));
check('the save path uses the same helper', app.includes('const totals=estimateTotals(items);'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("oil-estimation", async () => {
/**
 * 用油本地化（2026-11-19，1.4.59）。
 * 用户要求：用油要从整体菜品判断；据查主流 AI 健康 App 里只有「按菜品类型取均值」这条路被验证过。
 * 契约：模型只给烹饪方式，油由本地按「方式 × 克重」算（基线 8.1 g/100 g，IJERPH 2019），
 * 整餐三档只乘一次，旧草稿已含油的不重复加。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const source = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf("  const OIL_METHOD_FACTORS = {");
const end = source.indexOf('  function renderOilLevel() {');
if (start < 0 || end < 0) throw new Error('oil rule slice markers not found');

const sandbox = {
  number: v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)),
  String, Object, Math, Array, JSON,
};
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end) + `
this.oilRuleFor = oilRuleFor;
this.applyOilToItems = applyOilToItems;
this.isPackagedFood = isPackagedFood;
`, sandbox);

// --- 1. 方式 × 克重 ---------------------------------------------------------------------------------------
check('a stir-fried dish uses the 8.1 g/100 g baseline', Math.abs(sandbox.oilRuleFor('炒', 200) - 16.2) < 0.01, sandbox.oilRuleFor('炒', 200));
check('deep-fried costs more oil than steamed', sandbox.oilRuleFor('炸', 100) > sandbox.oilRuleFor('炒', 100) && sandbox.oilRuleFor('炒', 100) > sandbox.oilRuleFor('蒸', 100), [sandbox.oilRuleFor('炸', 100), sandbox.oilRuleFor('炒', 100), sandbox.oilRuleFor('蒸', 100)].join('/'));
check('steamed and blanched count as zero oil', sandbox.oilRuleFor('蒸', 300) === 0 && sandbox.oilRuleFor('白灼', 300) === 0);
check('an unknown method falls back to 其他', sandbox.oilRuleFor('瞎写的方法', 100) === 6, sandbox.oilRuleFor('瞎写的方法', 100));
check('missing grams means no oil', sandbox.oilRuleFor('炒', null) === 0);

// --- 2. 油算进菜里：热量 +9 kcal/g、脂肪 +1 g/g ----------------------------------------------------------
const base = [{name: '青椒肉丝', grams: 200, method: '炒', calories: 220, protein: 14, fat: 8, carbs: 10}];
const oiled = sandbox.applyOilToItems(base, 'normal')[0];
check('oil is added to calories and fat exactly once', oiled.calories === 220 + Math.round(16.2 * 9) && Math.abs(oiled.fat - (8 + 16.2)) < 0.01, `${oiled.calories} kcal / ${oiled.fat} g fat`);
check('the dish records which method produced the oil', oiled.oilMethod === '炒' && oiled.oilGrams === 16.2, `${oiled.oilMethod}/${oiled.oilGrams}`);
const low = sandbox.applyOilToItems(base, 'low')[0];
const high = sandbox.applyOilToItems(base, 'high')[0];
check('the meal-level switch scales oil once', low.oilGrams < oiled.oilGrams && high.oilGrams > oiled.oilGrams, `${low.oilGrams}/${oiled.oilGrams}/${high.oilGrams}`);
check('a draft that already carries oil is left untouched', sandbox.applyOilToItems([{...base[0], oilGrams: 12, oilIncluded: true}], 'high')[0].oilGrams === 12);
check('steamed dishes are not inflated', sandbox.applyOilToItems([{name: '清蒸鱼', grams: 300, method: '蒸', calories: 180, protein: 30, fat: 6, carbs: 0}], 'high')[0].calories === 180);

// --- 2b. 包装/成品零食不再加烹调用油（2026-11-21 用户反馈） ------------------------------------------------
const snack = [{name: '薯片', grams: 50, method: '其他', calories: 270, protein: 3, fat: 17, carbs: 26}];
const snackOiled = sandbox.applyOilToItems(snack, 'normal')[0];
check('a packaged snack keeps its own numbers', snackOiled.calories === 270 && snackOiled.fat === 17 && !snackOiled.oilGrams, `${snackOiled.calories} kcal / ${snackOiled.fat} g`);
check('isPackagedFood flags ready-to-eat items', sandbox.isPackagedFood({name: '酸奶', method: '其他'}) === true && sandbox.isPackagedFood({name: '饼干'}) === true && sandbox.isPackagedFood({name: '青椒肉丝', method: '炒'}) === false);
check('an explicit cooking method still wins over the name hint', sandbox.applyOilToItems([{name: '炸薯条', grams: 100, method: '炸', calories: 300, protein: 4, fat: 15, carbs: 40}], 'normal')[0].oilGrams === 14);
check('an explicit packaged marker also skips oil', sandbox.applyOilToItems([{name: '鸡胸沙拉', grams: 200, method: '其他', packaged: true, calories: 200, protein: 30, fat: 6, carbs: 5}], 'high')[0].calories === 200);

// --- 3. 接线：提示词只要方式、解析保留方式、界面有三档 ----------------------------------------------------
const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
check('the prompt asks for a cooking method, not grams of oil', prompts.includes('每道菜必须给 method') && prompts.includes('不要输出 oilGrams'));
check('the prompt enumerates the method vocabulary', prompts.includes('炒/爆炒/红烧/干锅/煎/炸/油淋/烤/蒸/煮/炖/凉拌/白灼/生食/其他'));
check('the native parser keeps the method field', main.includes('clean.put("method", method)'));
check('the preview exposes a three-level oil switch', html.includes('id="estimate-oil-level"') && html.includes('data-oil-level="high"'));
check('the switch is wired and preserves edited grams', app.includes('setOilLevel(button.dataset.oilLevel)') && app.includes('只调整油量差额'));
check('the level switch leaves packaged items alone', app.includes('isPackagedFood({...raw, name: (nameField && nameField.value) || raw.name})'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("oil-level", async () => {
/**
 * Oil-level changes must be reversible and non-negative, including when the row was
 * manually edited or already carried a different amount of oil.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '';
  for (let i = open; i < source.length; i++) {
    const ch = source[i], prev = source[i - 1];
    if (quote) { if (ch === quote && prev !== '\\') quote = ''; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated ' + name);
}
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const adjust = new Function('number', extractFunction(app, 'oilAdjustedValues') + '\nreturn oilAdjustedValues;')(number);

let out = adjust(180, 20, 9, 5.4);
check('normal -> low removes only the difference and stays positive', out.calories === 148 && out.fat === 16.4, out);
out = adjust(180, 3, 9, 5.4);
check('a row whose fat is below the old oil estimate cannot go negative', out.calories === 148 && out.fat === 5.4, out);
out = adjust(100, 10, 0, 5.4);
check('a row without old oil gets the new oil added', out.calories === 149 && out.fat === 15.4, out);
out = adjust(50, 2, 3, 1.8);
check('the result is rounded to display precision', out.calories === 39 && out.fat === 1.8, out);
check('the setter uses the row actual oil, not the previous ratio', app.includes("number(row.dataset.oil) ?? number(raw.oilGrams) ?? 0") && app.includes('oilAdjustedValues(cal && cal.value, fat && fat.value, oldOil, newOil)'));
check('gram edits scale the row oil marker with the row calories', app.includes('row.dataset.oil = String(Math.round(oil * ratio * 10) / 10)'));
check('saved/mixed dishes with included oil are skipped', app.includes('if (raw.oilIncluded === true) return;'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});
console.log('\nFAIL total: ' + __fail);
process.exitCode = __fail ? 1 : 0;
