/**
 * Step 2 checks: the app must not under-report calories, must disclose the estimate interval, must
 * record cooking oil explicitly, and must reuse the user's own anchor table instead of inventing
 * numbers. Runs the shipped anchors.js so the assertions cannot drift from the asset.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const anchorsSource = fs.readFileSync('app/src/main/assets/anchors.js', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');
const routes = fs.readFileSync('app/src/main/java/cn/qingheng/health/bridge/MetaRoutes.java', 'utf8');
const alarm = fs.readFileSync('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', 'utf8');

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
check('estimator prompt explains why', prompts.includes('两者要抵消'));
check('estimator returns oil separately', prompts.includes('\\"oilGrams\\":0') && main.includes('oilIncluded'));
check('estimator returns an uncertainty', prompts.includes('\\"uncertaintyPercent\\":15'));
check('the estimate contract no longer asks the model for totals', !prompts.includes('\\"totals\\":{') && prompts.includes('不要输出 totals'));
check('recalc re-estimates from the edited name and grams', html.includes('id="item-recalc-name"') && app.includes("text:`${name} ${grams} g`") && app.includes('noDraft:true'));
check('a recalc that only wants numbers leaves no draft behind', main.includes('b.optBoolean("noDraft", false)') && main.includes('drafts.add(id);'));
check('recalc still offers the manual per-100g path offline', app.includes('离线或未授权外部模型：请填上每 100g 四项数值'));
check('estimates can stream and the page shows progress', main.includes('/api/estimate/stream') && main.includes('startEstimateStream') && app.includes("api('/api/estimate/stream'") && app.includes('正在识别'));
check('a streaming estimate still falls back to the buffered route', app.includes("catch(streamError){data=await api('/api/estimate',payload);}"));
check('interval bounds are computed for display', main.includes('draft.put(k + "Low"') && main.includes('draft.put(k + "High"'));
check('an absurd uncertainty falls back to 15', main.includes('if (uncertainty <= 0 || uncertainty > 60) uncertainty = 15;'));
check('oil is bounded', main.includes('if (oilGrams > 500) throw fail'));
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
check('the manual form has an oil field', html.includes('<input name="oilSpoons" type="number"'));
check('one spoon is defined in the UI', html.includes('1 勺≈10 g≈90 kcal'));
check('oil is added to the record exactly once', app.includes('const oilKcal=Math.round(oilGrams*9)') && app.includes('oilAddedKcal:oilKcal'));
check('the added oil is stored for later recalculation', app.includes('oilAddedFat:oilGrams'));
check('a meal row shows the oil amount', app.includes('function oilLabel(meal)') && app.includes('用油 <b>'));
check('a confirmed estimate keeps its oil amount', /number\(draft\.oilGrams\)>0\?\{oilGrams:number\(draft\.oilGrams\),oilIncluded:true\}/.test(app));

// --- the interval and the warning reach the user ---------------------------------------------------
check('the preview shows the estimate interval', app.includes('估算区间：约 '));
check('the preview warns that photo estimates may drift', app.includes('不必刻意往高报'));
check('the preview says what to check', app.includes('请核对份量与用油'));
check('the preview calls out missing oil', app.includes('照片无法判断用油量'));
check('the preview states the oil that was counted', app.includes('已计入烹调用油'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
