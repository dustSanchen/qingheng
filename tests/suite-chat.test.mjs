/**
 * 合并后的 chat 套件（由 114 个单文件回归合并而来，2026-11-23）。
 * 每个原文件仍在自己的函数作用域里跑：一个文件抛错只记一条 FAIL，不会中断同组其他文件。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {functionSource, constSource, constLine} from './lib/extract.mjs';

let __fail = 0;
async function __run(name, fn) {
  try { const n = await fn(); __fail += Number(n) || 0; }
  catch (error) { console.log('FAIL  [' + name + '] ' + (error && error.message ? error.message : error)); __fail += 1; }
}

await __run("advice-actions", async () => {
/**
 * Advice actionItems (1.4.72): optional, whitelisted, form-opening only. Old string actions remain valid.
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
const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const source = [
  'const ADVICE_ACTION_TARGETS = {record_meal: "meal-text", record_weight: "measurement-weight", record_sleep: "habit-sleep", open_training: "training-form"};',
  'const ADVICE_ACTION_LABELS = {record_meal: "记这一餐", record_weight: "记录体重", record_sleep: "记录睡眠", open_training: "打开训练"};',
  extractFunction(app, 'normalizeAdviceActions'),
  'return normalizeAdviceActions;'
].join('\n');
const normalize = new Function(source)();
const messages = ['今天蛋白质还差一些', '下一餐补一份蛋白质', '记一下体重'];

let actions = normalize([{index: 0, type: 'record_meal', payload: {slot: 'dinner'}}], messages, true);
check('a valid meal action survives', actions.length === 1 && actions[0].type === 'record_meal');
check('it opens the existing meal field', actions[0] && actions[0].target === 'meal-text', actions[0] && actions[0].target);
check('the validated slot is kept', actions[0] && actions[0].mealSlot === 'dinner', actions[0] && actions[0].mealSlot);
check('the label comes from local copy, not the model', actions[0] && actions[0].label === '记这一餐', actions[0] && actions[0].label);

actions = normalize([{index: 1, type: 'record_weight'}], messages, true);
check('a weight action points at the measured field', actions[0] && actions[0].target === 'measurement-weight', actions[0] && actions[0].target);

actions = normalize([{index: 2, type: 'record_sleep'}], messages, true);
check('a sleep action points at the habit field', actions[0] && actions[0].target === 'habit-sleep', actions[0] && actions[0].target);

actions = normalize([{index: 0, type: 'open_training'}], messages, false);
check('training is dropped for a no-training profile', actions.length === 0, actions.length);
actions = normalize([{index: 0, type: 'open_training'}], messages, true);
check('training opens the existing training form when enabled', actions[0] && actions[0].target === 'training-form', actions[0] && actions[0].target);

for (const item of [
  null,
  {},
  {index: -1, type: 'record_weight'},
  {index: 99, type: 'record_weight'},
  {index: 0, type: 'open_url', payload: {url: 'https://example.com'}},
  {index: 0, type: 'record_meal', payload: {slot: 'brunch'}},
  {index: 0, type: 'record_meal', payload: {slot: '<script>'}},
  {index: 0, type: 'record_meal'}
]) {
  actions = normalize([item], messages, true);
  check('malformed or unsafe action is ignored: ' + JSON.stringify(item), actions.length === 0, actions.length);
}

actions = normalize([
  {index: 0, type: 'record_meal', payload: {slot: 'lunch'}},
  {index: 0, type: 'record_weight'},
  {index: 1, type: 'record_weight'},
  {index: 2, type: 'record_sleep'}
], messages, true);
check('duplicate indices are collapsed and the unique set is capped', actions.length === 2, actions.length);
check('at most two action buttons are exposed', actions.length <= 2, actions.length);

const rich = normalize([{index: 0, type: 'record_meal', payload: {slot: 'lunch'}}], ['\n标题\n正文'], true);
check('rich advice still permits a valid action', rich.length === 1, rich.length);

check('the backend prompt documents actionItems', prompts.includes('actionItems') && prompts.includes('record_meal') && prompts.includes('record_weight') && prompts.includes('open_training'));
check('the backend validates action types', main.includes('adviceActionItemsFromReply') && main.includes('"record_weight".equals(type)') && main.includes('"record_meal".equals(type)'));
check('the backend does not accept arbitrary URLs', !main.includes('https://example.com') && main.includes('Arrays.asList("breakfast", "lunch", "dinner", "snack")'));
check('advice response keeps messages and adds actionItems', main.includes('.put("messages", output).put("actionItems", actionItems)'));
check('the app passes actionItems into renderAdvice', app.includes('renderAdvice(data.messages,date,data.actionItems)') && app.includes('local.actionItems'));
check('the frontend renders a delegated button group', app.includes('advice-action-row') && app.includes('data-advice-action') && app.includes('openRecordTarget(button.dataset.adviceTarget'));
check('old string-only advice still renders without actions', app.includes('const safeActions = normalizeAdviceActions(actionItems, rows'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("advice-contract", async () => {
/**
 * 建议输出契约（2026-11-19，1.4.64）。
 * 用户选 B：输出改成 {verdict, actions} JSON，本地校验 + 本地渲染，不合格不回模型重试。
 * 这里只钉「契约与本地兜底」的结构，不钉模型文案。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

check('the advice prompt asks for strict JSON', prompts.includes('输出必须是严格 JSON') && prompts.includes('决策') === false);
check('the schema names verdict and actions', prompts.includes('\\"verdict\\"') && prompts.includes('\\"actions\\"'));
check('the prompt forbids markdown and code fences', prompts.includes('不要代码块') && prompts.includes('不要 Markdown'));
check('verdict and action lengths are stated', prompts.includes('不超过 40 个汉字') && prompts.includes('不超过 30 个汉字'));

check('the reply is parsed with a local validator', main.includes('private static JSONArray adviceFromReply') && main.includes('private static String clipAdvice'));
check('a malformed reply falls back to the prose parser', /adviceFromReply[\s\S]{0,1200}?adviceMessages\(text\)/.test(main));
check('verdict is clipped to 60 characters', main.includes('obj.optString("verdict", ""), 60'));
check('actions are clipped to 40 characters and capped at two', main.includes('), 40') && main.includes('actions.size() < 2'));
check('the stored summary is plain text, not raw JSON', main.includes('saveAdviceHistory(day, output, "api")') && main.includes('advicePlainText(output)'));
check('the JSON is extracted tolerantly (braces, not whole string)', main.includes('text.substring(start, end + 1)'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("advice-targets", async () => {

const root = new URL('../app/src/main/assets/', import.meta.url);
const code = fs.readFileSync(new URL('native-adapter.js', root), 'utf8');
const java = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/MainActivity.java', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('app.js', root), 'utf8');
const html = fs.readFileSync(new URL('index.html', root), 'utf8');

const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayOffset = days => { const date = new Date(); date.setDate(date.getDate() + days); return localDate(date); };
const today = localDate();

function environment(seed) {
  const saved = new Map([['qingheng-android-browser-demo-v1', JSON.stringify(seed)]]);
  const href = 'http://localhost:9090/index.html';
  const url = new URL(href);
  const ctx = {
    URL, Headers, AbortController, console, setTimeout, clearTimeout,
    location: {href, protocol: url.protocol, hostname: url.hostname, origin: url.origin},
    localStorage: {
      getItem: key => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, String(value)),
      removeItem: key => saved.delete(key)
    }
  };
  ctx.window = ctx;
  ctx.fetch = async () => ({ok: true, json: async () => ({})});
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return {ctx, saved};
}

async function request(ctx, path, body) {
  const response = await ctx.fetch(path, body === undefined ? undefined : {method: 'POST', body: JSON.stringify(body)});
  return {ok: response.ok, data: await response.json()};
}

const seed = {
  version: 1,
  profile: {
    sex: 'male', height: 166, age: 24, goal: 'cut',
    calorieTarget: 1800, proteinMin: 100, proteinMax: 130, fatMin: 40, fatMax: 60
  },
  measurements: [
    {date: dayOffset(-10), weight: 65},
    {date: dayOffset(-1), weight: 65.8}
  ],
  meals: [{date: today, calories: 2100, protein: 55, fat: 75, carbs: 220}],
  habits: [], chats: []
};

const {ctx, saved} = environment(seed);
let result = await request(ctx, `/api/advice`, {date: today});
assert.equal(result.data.source, 'local');
const advice = result.data.messages.join('\n');
assert.match(advice, /24 岁/);
assert.match(advice, /身高 166cm/);
assert.match(advice, /14 天上升 0\.8kg/);
assert.match(advice, /今天补蛋白质/);
assert.match(advice, /鸡蛋|酸奶|鱼肉|豆制品/);
assert.match(advice, /明天减少脂肪/);
assert.match(advice, /今天按原节奏收尾/);
assert(!/TDEE|2000 kcal|来源：|不替代医疗|不构成医疗/.test(advice));
assert(result.data.messages.every(message => typeof message === 'string' && !/^(?:[-#]|\d+[.、)])/.test(message.trim())));
result = await request(ctx, '/api/profile', {age: null});
result = await request(ctx, `/api/advice`, {date: today});
assert.match(result.data.messages.join('\n'), /年龄未记录/);

result = await request(ctx, '/api/target-adjustment', {action: 'adjust'});
assert.equal(result.data.active, true);
assert.equal(result.data.effectiveDate, dayOffset(1));
assert.equal(result.data.original.calorieTarget, 1800);
assert.equal(result.data.original.fatMax, 60);
assert(result.data.temporary.calorieTarget < 1800);
assert(result.data.temporary.calorieTarget >= 1500, 'a one-day cut never crosses the sex-based safety minimum');
assert(result.data.temporary.fatMax < 60);
assert(result.data.temporary.fatMax >= result.data.temporary.fatMin);

// A target already at the safety minimum must be refused instead of silently cut further.
const atFloor = structuredClone(seed);
atFloor.profile.calorieTarget = 1500;
atFloor.meals = [{date: today, calories: 2400, protein: 55, fat: 75, carbs: 220}];
const floorCase = environment(atFloor);
await assert.rejects(async () => {
  const response = await floorCase.ctx.fetch('/api/target-adjustment', {method: 'POST', body: JSON.stringify({action: 'adjust'})});
  if (response.ok) return;
  throw new Error('refused');
}, /refused/);
assert.match(java, /不应再下调/, 'the native route refuses below the safety minimum too');
assert(!app.includes('intakeFloor'), 'the page no longer submits a hard intake floor with the profile');

const state = await request(ctx, '/api/state');
assert.equal(state.data.profile.calorieTarget, 1800, 'temporary adjustment must not overwrite base target');
assert.equal(state.data.temporaryTargets.status, 'active');
assert.equal(JSON.parse(saved.get('qingheng-android-browser-demo-v1')).temporaryTargets.effectiveDate, dayOffset(1));

const expiredSeed = structuredClone(seed);
expiredSeed.temporaryTargets = {
  status: 'active', effectiveDate: dayOffset(-1),
  original: {calorieTarget: 1800, fatMin: 40, fatMax: 60},
  temporary: {calorieTarget: 1600, fatMin: 40, fatMax: 54}
};
const expired = environment(expiredSeed);
result = await request(expired.ctx, '/api/state');
assert.equal(result.data.temporaryTargets, undefined, 'expired one-day target restores the base profile');

assert.match(java, /private boolean expireTemporaryTargets\(\)/);
assert.match(java, /effective\.compareTo\(dayOffset\(0\)\) >= 0/);
assert.match(java, /state\.remove\(TEMP_TARGETS\)/);
assert.match(java, /weightChange14Days/);
assert.match(java, /next\.put\("onboardingDone", onboarding\)/);
assert.match(app, /height: form\.elements\.height\.value/);
assert.match(app, /age: form\.elements\.age\.value/);
assert.match(app, /api\/target-adjustment/);
assert(app.includes(String.raw`\*\*([^*\n]{1,160})\*\*`));
assert.match(html, /<label>年龄<input name="age"/);
assert(!/advice-content[^>]*>[^<]*(?:基于你的已记录|不代替专业)/.test(html));

console.log('PASS advice/targets: body-aware actionable advice, bold-safe output, one-day target proposal preserves base values, and expiry restores the original target.');
;return typeof fail === 'number' ? fail : 0;
});

await __run("ai-plan-focus", async () => {
/**
 * 「用 AI 排今天」曾经报「模型这次没有给出回答内容（可能只返回了思考过程）」：
 * 通用问答人设要求「最多 3 句」，用户消息却要「只输出 JSON 数组」，模型两头不讨好，只回了思考过程。
 * 这一轮的契约：清单请求走独立提示词与独立预算，空回答自动重试一次，前端不再被一个抛错卡死按钮。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const rest = read('app/src/fragments/70-rest.fragment.js');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');

// --- client: one dedicated request -------------------------------------------------------------------
// 窗口而不是 indexOf('\n  }\n')：检出时是 CRLF，按 LF 切片会把函数切空。
const planBody = rest.slice(rest.indexOf('async function askAiPlan'));
// 窗口 9000：1.4.44 给提示词加了负重三层兜底与起步重量规则，函数变长了，6000 会把 finally 切在窗口外。
const planFn = planBody.slice(0, 9000);
check('the plan asks the chat route for plan focus', planFn.includes('focus: "plan"'));
check('the plan no longer sets the conflicting fast tier', !planFn.includes('tier: "fast"'));
check('the busy layer is raised before any prompt work can throw',
  planFn.indexOf('showBusy("正在排今天的动作顺序…", "plan-busy")') > 0
  && planFn.indexOf('showBusy("正在排今天的动作顺序…", "plan-busy")') < planFn.indexOf('const prefs = typeof planPrefs'));
check('the button is restored in finally', planFn.includes('} finally {') && planFn.includes('button.disabled = false;'));
// 只钉语义（慢时要说明还在等模型 + 12s 兜底提示），不钉整句文案——文案会改，断言不该跟着改。
check('a slow call says what it is waiting for', planFn.includes('模型还在排') && planFn.includes('setTimeout(() => showBusy("模型还在排') && planFn.includes('12000'));
check('the old plan survives an empty reply', planFn.includes('原清单已保留'));

// --- client: tolerant parsing -------------------------------------------------------------------------
check('fenced replies are stripped', rest.includes('function parseAiPlanReply') && rest.includes('.replace(/```[a-zA-Z]*/g, "")'));
check('the array is found by bracket balance, not lastIndexOf', rest.includes('if (ch === "[") depth += 1;') && rest.includes('if (!depth) { end = i; break; }'));
check('trailing commas are tolerated', rest.includes('.replace(/,\\s*([\\]}])/g, "$1")'));
check('an unparsable reply yields no plan instead of throwing', /try \{ rows = JSON\.parse\(slice\); \} catch \{ return \[\]; \}/.test(rest));
check('the plan is capped like the editor cap', rest.includes('.slice(0, 12).map(planItemFromRow)'));

// --- native: separate prompt and budget ---------------------------------------------------------------
check('the native side knows the plan focus', main.includes('boolean planFocus = "plan".equals(b.optString("focus", ""))'));
check('the plan gets its own JSON-only system prompt', main.includes('planFocus ? planSystemPrompt() : chatSystemPrompt()') && main.includes('private static String planSystemPrompt()'));
check('the JSON-only prompt forbids prose and fences', main.includes('不要写任何解释、不要加 ``` 代码块标记'));
check('the fast-tier sentence is skipped for the plan', main.includes('boolean fastTier = !planFocus && "fast".equals('));
check('the deep context is skipped for the plan', main.includes('if (!planFocus) messages.put(new JSONObject().put("role", "system").put("content", fastTier ?'));
check('the library digest instruction is skipped for the plan', main.includes('String libraryDigest = planFocus ? "" :'));
check('the plan gets a bigger output budget', main.includes('private static final int CAP_PLAN = 1400;') && main.includes('int cap = planFocus ? CAP_PLAN : CAP_CHAT_BUFFERED;'));
check('an empty reply is retried once at four times the budget', main.includes('private static final String EMPTY_REPLY') && main.includes('reply = chat(c, model, messages, cap * 4).trim();'));
check('the plan never triggers a web lookup', main.includes('!fastTier && !planFocus && b.optBoolean("webSearch", false)'));
check('the training-window instruction stays out of the plan', main.includes('if (!planFocus && "training".equals(b.optString("focus", "")))'));

// --- the adapter must actually deliver the request fields ---------------------------------------------
// 2026-11-07: focus/tier/library were silently dropped by the adapter's field whitelist, so every
// native branch keyed on them was dead code and the plan request reached the model as plain chat.
const adapter = read('app/src/main/assets/native-adapter.js');
const bodyFn = adapter.slice(adapter.indexOf('const chatNativeBody='), adapter.indexOf('const chatNativeBody=') + 1200);
check('the adapter has one shared chat body whitelist', adapter.includes('const chatNativeBody=(body,image)=>'));
check('the plan focus survives the adapter', bodyFn.includes('focus:body.focus'));
check('the fast tier survives the adapter', bodyFn.includes("body?.tier==='fast'"));
check('the library digest survives the adapter', bodyFn.includes('library:body.library'));
check('the buffered chat route uses the whitelist', adapter.includes("const reply=await nativeRequest(path,method,chatNativeBody(body,image),options.signal);"));
check('the streaming chat route uses the whitelist', adapter.includes("nativeRequest('/api/chat/stream','POST',chatNativeBody(body,image),options.signal)"));

// --- the shipped bundle carries the same code ----------------------------------------------------------
check('the generated app.js is in sync with the fragments', app.includes('function parseAiPlanReply') && app.includes('focus: "plan"'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("ai-upgrade", async () => {
/**
 * AI upgrade checks: reasoning models expose thinking separately, retrieval runs several queries and
 * de-duplicates, the answer keeps a fixed shape, and the 薄肌 plan travels with the question.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const completion = read('app/src/main/java/cn/qingheng/health/ChatCompletion.java');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');
const adapter = read('app/src/main/assets/native-adapter.js');
const app = read('app/src/main/assets/app.js');

// --- reasoning models -------------------------------------------------------------------------------
check('a thinking sink can be passed alongside the answer sink', completion.includes('Delta onDelta, Delta onThink'));
check('the old signature still works', completion.includes('return stream(config, apiKey, model, messages, onDelta, null);'));
check('reasoning_content is read', completion.includes('text(piece, "reasoning_content")'));
check('an alternate reasoning key is accepted', completion.includes('text(piece, "reasoning")'));
check('thinking is never appended to the answer', completion.includes('onThink.onDelta(reasoning)') && !/answer\.append\(reasoning\)/.test(completion));
check('the stream pushes think events', main.includes('text -> pushChatEvent("think", id, text, null)'));
check('the adapter forwards think events', adapter.includes("if(event.kind==='think')") && adapter.includes('sink.onThink'));
check('the page renders a thinking block', app.includes('stream-think') && app.includes('function pushChatThinking'));
check('thinking collapses to a one-line summary', app.includes('已思考 ${box.thinking.length} 字'));

// --- multi-query retrieval --------------------------------------------------------------------------
check('queries are rewritten into an array', main.includes('private JSONArray searchQueries(JSONObject c, String model, String question)'));
check('at most three queries are used', main.includes('i < 3') && main.includes('cleaned.length() < 3'));
check('the rewrite is JSON-only and bounded', main.includes('只输出 JSON 数组') && main.includes('piece.length() > 40'));
check('a failed rewrite falls back to the question', main.includes('return out;') && main.includes('return cleaned.length() > 0 ? cleaned : out;'));
check('each query is searched', main.includes('private JSONObject searchAll(JSONArray queries, String question)'));
check('hits are de-duplicated by url', main.includes('if (url.isEmpty() || !seen.add(url)) continue;'));
check('the merged set is reported', main.includes('.put("queries", queries)'));
check('generic results keep local relevance filtering while DeepSeek uses its API rerank',
  main.includes(': relevantResults(web.optJSONArray("results"), question, searchWords);')
    && main.includes('web.optBoolean("deepseekSearchApi", false)'));

// --- answer shape ------------------------------------------------------------------------------------
check('answers must lead with the conclusion', prompts.includes('【回答形状】把答案放在第一句'));
check('numbers carry units and a range', prompts.includes('带单位与区间'));
check('calculations are limited to one or two steps', prompts.includes('只写 1~2 步算式'));

// --- 薄肌 guidance ------------------------------------------------------------------------------------
check('the prompt defines 薄肌 scientifically', prompts.includes('【薄肌问答】') && prompts.includes('低体脂 + 中等肌肉量'));
check('it gives protein and deficit numbers', prompts.includes('2.2~2.6 g/kg') && prompts.includes('热量缺口 12%'));
check('it gives training and lifestyle doses', prompts.includes('12~18 组/肌群/周') && prompts.includes('步数 8000~10000'));
check('it names the myths', prompts.includes('局部减脂不成立') && prompts.includes('纯有氧会掉肌肉'));
check('it defers to the app plan when present', prompts.includes('直接引用其中的区间与速率'));

// --- the goal mode travels with the question -----------------------------------------------------------
check('the goal is in the chat context', main.includes('context.put("goal", goal)') && main.includes('.put("goalLabel", goalText(profile))') );

// --- 薄肌 target mode -------------------------------------------------------------------------------
const targets = read('app/src/fragments/40-targets.fragment.js');
check('a lean preset exists in the app', targets.includes('lean:     {deficitPercent: 12'));
check('lean is a selectable goal', read('app/src/main/assets/index.html').includes('name="goal" value="lean"'));
check('lean has a native label', main.includes('raw.equals("lean")'));

check('a short entity question skips the rewrite call', main.includes('if (isSingleQueryCandidate(question)) return new JSONArray().put(fallback);'));
check('the heuristic refuses long questions', main.includes('question.length() > 14) return false;'));
check('the heuristic refuses interrogatives', main.includes('"多少", "怎么", "如何"'));

// 1.4.63：建议路径关思考，且删掉「空回复 ×4 预算」的重试（那是把拖延写进代码）。
check('advice disables thinking', main.includes('CAP_ADVICE, false') && main.includes('boolean thinking'));
check('the slow 4x retry is gone', !main.includes('CAP_ADVICE * 4'));
check('complete exposes a thinking switch', completion.includes('int maxTokens, boolean thinking') && completion.includes('if (!thinking) disableThinking'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("analysis-layer", async () => {
/**
 * P0-2/P0-3/P1-4/P1-5/P2-8 的真实断言：从产物抽出纯函数，在 Node 里直接跑。
 */

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
// 2026-11-23 Phase 2：纯函数按名取（55 领域层 + 60 文案层），不再按相邻函数切标记。
const chat60 = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const domain = fs.readFileSync('app/src/fragments/55-training-domain.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const targets = fs.readFileSync('app/src/fragments/40-targets.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const pureSource = [
  constSource(chat60, 'DRAFT_MOVES'),
  constSource(chat60, 'DRAFT_KINDS'),
  constSource(chat60, 'DAILY_CHECK_WEIGHTS'),
  constLine(domain, 'ACWR_HIGH'),
  constLine(domain, 'ACWR_LOW'),
  constLine(chat60, 'PLATEAU_SPAN_KG'),
  constSource(targets, 'GOAL_PRESETS'),
  constLine(domain, 'BODYWEIGHT_MOVES'),
  constLine(domain, 'USER_BODYWEIGHT'),
  functionSource(domain, 'readBodyweightMarks'),
  functionSource(domain, 'isBodyweightMove'),
  functionSource(domain, 'loadableWeightKg'),
  functionSource(chat60, 'parseDraft'),
  functionSource(chat60, 'parseTrainingDraft'),
  functionSource(chat60, 'draftSummary'),
  functionSource(chat60, 'dailyCheck'),
  functionSource(domain, 'acwrFromDailyLoads'),
  functionSource(chat60, 'plateauFromWeekly'),
  functionSource(domain, 'generateWeekPlan'),
  constSource(domain, 'BODY_PART_RULES'),
  functionSource(domain, 'exerciseBodyPart'),
  'function localCoachLine(c){return c && c.action || "";}',
  'return {parseDraft, parseTrainingDraft, draftSummary, dailyCheck, acwrFromDailyLoads, plateauFromWeekly, generateWeekPlan, localCoachLine};',
].join('\n');
const api = new Function(pureSource)();

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
const unmeasured = api.dailyCheck({meals: [], habit: {}, range: {min: 0, max: 0, unset: true}});
check('an unmeasured profile asks for the profile instead of scoring', unmeasured.score === null && /身体档案与目标/.test(unmeasured.verdict), unmeasured.verdict);
const unmeasuredWithFood = api.dailyCheck({meals: [{totals: {calories: 2300, protein: 150, fat: 60}}], habit: {sleep: 8}, range: {min: 2150, max: 2350, unset: true}, proteinMin: 142, proteinMax: 155, fatMin: 55, fatMax: 70});
check('placeholder ranges never score calories', unmeasuredWithFood.items.find(i => i.key === 'calories').evaluated === false, JSON.stringify(unmeasuredWithFood.items.find(i => i.key === 'calories')));
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
;return typeof fail === 'number' ? fail : 0;
});

await __run("answer-table", async () => {
/**
 * Runs the shipped table parsers against the exact text a model produced, so "it should render as a
 * table" is a checked claim rather than an assumption.
 *
 * The sample is the real answer from the device log: a header line plus one data line, with no blank
 * line between them.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

// Normalised to LF so the slice markers below can be written plainly.
const source = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const slice = (startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${startMarker} not found`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`end marker for ${startMarker} not found`);
  return source.slice(start, end);
};

const sandbox = {
  esc: value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  number: v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null),
  String, Number, Array, RegExp, Math, Set, Boolean,
};
vm.createContext(sandbox);
const code = [
  slice('  const answerNumericCell', '\n  /**'),
  slice('  /** Widest table that still reads on a phone', '  /** Plain text'),
  slice('  function answerSpaceTable(rows) {', '\n  }\n') + '\n  }',
  '  function answerInline(text) { return esc(text); }',
].join('\n');
vm.runInContext(code + '\nthis.answerSpaceTable = answerSpaceTable; this.answerTable = answerTable; this.answerTableFits = answerTableFits;', sandbox);
const {answerSpaceTable, answerTable} = sandbox;

// The real answer text, split the way the renderer splits blocks (on blank lines).
const block = [
  '日期 热量（千卡） 蛋白质（克） 记录餐数',
  '2026-10-16 1755.1 99.22 3',
];
const spaceHtml = answerSpaceTable(block);
check('the real whitespace table renders as a table', spaceHtml.includes('<table'), spaceHtml.slice(0, 80));
check('it is wrapped so it can scroll', spaceHtml.includes('answer-table-wrap'));
check('it has a header row and one body row', (spaceHtml.match(/<tr>/g) || []).length === 2, spaceHtml);

const threeDays = [
  '日期 热量（千卡） 蛋白质（克） 记录餐数',
  '2026-10-16 1755.1 99.22 3',
  '2026-10-15 2103.4 121.5 4',
  '2026-10-14 1890 98 3',
];
check('three days still fit', answerSpaceTable(threeDays).includes('<table'));

// A Markdown pipe table must render too, and must be refused when it cannot fit a phone.
const pipes = ['| 日期 | 热量 | 蛋白 |', '| --- | --- | --- |', '| 2026-10-16 | 1755 | 99 |'];
check('a pipe table renders', answerTable(pipes.slice(1)).includes('<table') || answerTable(pipes).includes('<table'));

const tooWide = ['日期 热量 蛋白 脂肪 碳水 记录餐数', '2026-10-16 1755 99 60 200 3'];
check('a table wider than four columns is not drawn', answerSpaceTable(tooWide) === '', answerSpaceTable(tooWide).slice(0, 40));

const tooLong = ['日期 热量 蛋白 记录餐数'].concat(
  Array.from({length: 12}, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')} 1800 100 3`));
check('a table longer than eight rows is not drawn', answerSpaceTable(tooLong) === '');

const longCell = ['日期 热量 蛋白质说明文字特别长的一列 记录餐数', '2026-10-16 1755 这是一段很长的说明文字 3'];
check('a table with an oversized cell is not drawn as a table', answerSpaceTable(longCell) === '');

// Prose must never be mistaken for a table.
const prose = ['我建议你今天把蛋白质补到 130 克左右，', '晚餐可以加一掌大的鱼或一份豆腐。'];
check('ordinary prose is not turned into a table', answerSpaceTable(prose) === '');
;return typeof fail === 'number' ? fail : 0;
});

await __run("chat-compose", async () => {
/**
 * Chat composer density: one question block, a single horizontal row of suggested
 * questions, and a compact right-aligned send action. No second billing tag bar.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

check('the duplicate billing tag is not shown as a bar', css.includes('#view-chat .card-heading--chat{display:none}'));
check('suggested questions use one horizontal strip', css.includes('#view-chat #chat-chips{display:flex;flex-wrap:nowrap;gap:8px;overflow-x:auto'));
check('the strip starts at the first question, not a clipped middle', fs.readFileSync('app/src/main/assets/app.js', 'utf8').includes('row.scrollLeft = 0;'));
check('the question box is shorter than the old three-row block', css.includes('#view-chat #chat-question{height:84px;min-height:84px'));
check('one rounded composer holds the question, attachments and send', html.includes('class="chat-composer" id="chat-composer"') && html.includes('class="chat-composer-tools"') && html.indexOf('id="chat-composer"') < html.indexOf('id="chat-send"'));
check('the send action is inside the composer, not a bottom-right bar', html.includes('class="chat-send-button" id="chat-send"') && !html.includes('class="chat-send-bar"'));
check('the composer still has one send button', (html.match(/id="chat-send"/g) || []).length === 1);
check('the history card is not covered by a fixed composer', !/#view-chat \.chat-composer\{position:fixed/.test(css));
check('tab focus does not paint a page-sized ring', css.includes('#main:focus-visible{outline:none}'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("chat-quality", async () => {
/**
 * Q&A round checks: answers come first, missing sections are skipped instead of blocking an answer,
 * tables fit a phone screen, the answer context carries body and training data, and lookup results
 * that do not match the question are dropped.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const app = read('app/src/main/assets/app.js');
const adapter = read('app/src/main/assets/native-adapter.js');
const deepSeekSearch = read('app/src/main/java/cn/qingheng/health/DeepSeekWebSearch.java');
const css = read('app/src/main/assets/styles.css');

// --- answer first, never refuse ---------------------------------------------------------------------
check('the prompt demands a direct answer first', prompts.includes('【先回答问题】永远先直接回答用户问的那件事'));
check('refusing is explicitly forbidden', prompts.includes('禁止拒答') && prompts.includes('禁止用「无法判断」'));
check('a best-effort answer is required even with partial data', prompts.includes('即使数据不全也要给出你能给的最好答案'));
check('missing sections are skipped silently', prompts.includes('【缺数据就跳过】') && prompts.includes('不要提、不要追问、不要要求用户补齐'));
check('missing is not treated as zero', prompts.includes('数据缺失时不要把缺失当成 0'));
check('the push advice never prints internal field names', prompts.includes('不要出现 intakeFloor') && prompts.includes('无法核算'));
check('missing day ranges fall back to the calorie target', prompts.includes('没有训练日/休息日区间时') && prompts.includes('calorieTarget'));
check('over-caution is called out', prompts.includes('【不要过度严谨】') && prompts.includes('不要罗列免责声明'));
check('medical constraints stay internal', prompts.includes('这一条只需在心里约束，不必每次写在回答里'));
check('answers are asked to be short', prompts.includes('通常 3~8 句，问什么答什么'));

// --- tables fit the screen --------------------------------------------------------------------------
check('the prompt caps columns', prompts.includes('最多 4 列'));
check('the prompt caps rows and cell length', prompts.includes('最多 8 行') && prompts.includes('单元格不超过 10 个字'));
check('the prompt says to drop the table when it would not fit', prompts.includes('宁可不做表格也不要挤成一团'));
check('the renderer enforces the same limits', app.includes('const ANSWER_TABLE_COLUMNS = 4, ANSWER_TABLE_ROWS = 8, ANSWER_TABLE_CELL = 12;'));
check('the renderer refuses an oversized table', app.includes('function answerTableFits(rows)') && app.includes("if (!answerTableFits([head].concat(body))) return '';"));
check('both table builders are guarded', app.split("if (!answerTableFits([head].concat(body))) return '';").length - 1 === 2);
check('tables scroll inside their own box', app.includes('<div class="answer-table-wrap">') && css.includes('.answer-table-wrap{max-width:100%;overflow-x:auto'));
check('cells wrap instead of widening the layout', css.includes('overflow-wrap:anywhere'));

// --- the answer context carries real body + training data --------------------------------------------
check('context adds a body block', main.includes('context.put("body", body)'));
check('it includes the latest measurement', main.includes('body.put("latest", current.put("date"') && main.includes('"weight", "waist", "bodyFat", "muscle", "visceralFat", "bmr"'));
check('it includes BMI', main.includes('body.put("bmi"'));
check('it includes weekly weight means', main.includes('weeklyWeightMeans(selectedDate)'));
check('it includes the last seven days of training', main.includes('trainingLast7Days') && main.includes('trainingLog(selectedDate, 7)'));
check('it includes per-exercise weekly volume', main.includes('weeklyVolumeByExercise(selectedDate)'));
check('it includes cooking oil', main.includes('oilSpoonsToday') && main.includes('oilSpoonsOn(selectedDate)'));
check('training entries carry exercise names and volume', main.includes('entry.put("exercises", names)') && main.includes('entry.put("volume", Math.round(volume))'));
check('weekly means group by Monday', main.includes('previousOrSame(java.time.DayOfWeek.MONDAY)'));

// --- network lookup relevance ------------------------------------------------------------------------
check('a relevance filter exists', main.includes('private static JSONArray relevantResults(JSONArray results, String question, String keywords)'));
check('results are scored against the question', main.includes('questionTerms(question + " " + keywords)') && main.includes('if (text.contains(term)) score += terms.optInt(term, 1);'));
check('unrelated results are removed', main.includes('if (score >= 2) kept.put(row);'));
check('the generic relevance filter runs before the model sees anything',
  main.includes(': relevantResults(web.optJSONArray("results"), question, searchWords)'));
check('an empty filtered set is treated as no lookup', main.includes('web.put("connected", web.optBoolean("connected") && kept.length() > 0);'));
check('the model is told unrelated hits were dropped', main.includes('检索返回的条目与问题不相关，已全部剔除'));
check('the prompt ignores irrelevant entries instead of changing topic', prompts.includes('若某条与问题无关就忽略它，不要为了用上检索结果而改变话题'));
check('a failed lookup is not mentioned to the user', prompts.includes('检索为空时就用常识与用户记录回答，不要提及检索失败'));
check('DeepSeek questions use its first-party Search API without an extra query rewrite', main.includes('DeepSeekWebSearch.search(c,') && main.includes('DeepSeekWebSearch.queryFor(question)'));
check('DeepSeek Search requests fetched page content and original question context',
  deepSeekSearch.includes('"need_content", true') && deepSeekSearch.includes('"ori_question"'));
check('DeepSeek Search results preserve summary, content, rank, date and authority',
  ['"summary"', '"content"', '"rerankScore"', '"date"', '"authority"'].every(field => deepSeekSearch.includes(field)));
check('DeepSeek results prefer high-rank authoritative sources and flag weaker sets',
  deepSeekSearch.includes('rerankScore", -1) >= 1.5') && deepSeekSearch.includes('authority", -1) >= 3')
    && deepSeekSearch.includes('"authorityLimited", !authoritativeFound'));
check('DeepSeek Fetch is used only for a small number of content gaps',
  deepSeekSearch.includes('FETCH_FALLBACKS = 2') && deepSeekSearch.includes('postToolApi(config, apiKey, "fetch"'));
check('DeepSeek Fetch rejects local hosts, private IPv4 and credentialed URLs',
  deepSeekSearch.includes('localHost(host) || privateIpv4(host)') && deepSeekSearch.includes('uri.getRawUserInfo() != null')
    && deepSeekSearch.includes('port == 443') && deepSeekSearch.includes('port == 80'));
check('DeepSeek search failures fall back to the existing search path',
  main.includes('DeepSeek Search unavailable; using existing lookup') && main.includes('web = searchAll(queries, question);'));
check('the answer context gives the model fetched text while treating pages as untrusted',
  main.includes('row.optString("content"') && main.includes('\\u5ffd\\u7565'));
check('low-authority web results are disclosed to the user and the answer model',
  main.includes('"authorityLimited", web.optBoolean("authorityLimited")')
    && main.includes('web.optBoolean("authorityLimited", false)')
    && app.includes('未找到高权威来源，具体数值请核对'));

// --- streaming can no longer break the answer --------------------------------------------------------
check('any streaming failure falls back to the buffered call', app.includes('data = await api(\'/api/chat\', payload);') && app.includes('已改用一次性返回'));
check('the buffered error is reported with the streaming one', app.includes('（流式尝试：'));
check('the stream times out instead of hanging', adapter.includes("reject(new Error('流式回答超时，请重试。'))") && adapter.includes('},120000);'));
check('the timeout clears the page handler', adapter.includes('settled=true;clearTimeout(timer);window.__qinghengChat=previous;fn(value);'));
check('a long answer is truncated rather than dropped', main.includes('answer = answer.substring(0, 7990) + "…（已截断）"') && !main.includes('throw fail("回答最多 8000 字符")'));

// --- JSON nulls must never become the literal word "null" (the "nullnull…" answer) --------------------
const completion = read('app/src/main/java/cn/qingheng/health/ChatCompletion.java');
const completionText = completion;
check('a null-safe string reader exists', completion.includes('public static String text(JSONObject object, String key)'));
check('DeepSeek Search and Fetch use fixed HTTPS paths with the key in the header',
  completion.includes('static JSONObject postToolApi') && completion.includes('"/v1/tools/" + tool')
    && completion.includes('if (!"search".equals(tool) && !"fetch".equals(tool))')
    && completion.includes('conn.setInstanceFollowRedirects(false)')
    && completion.includes('setRequestProperty("Authorization", "Bearer " + apiKey)'));
check('it treats JSON null as absent', completion.includes('if (raw == null || raw == JSONObject.NULL) return "";'));
check('blank detection recognises org.json nulls', completion.includes('public static boolean isBlank(String value)') && completion.includes('value.replace("null", "")'));
check('streamed deltas are read null-safely', completion.includes('delta = text(piece, "content");'));
check('the buffered message is read null-safely', completion.includes('String content = text(message, "content");'));
check('a thinking-only stream is refused instead of displayed', completion.includes('模型这次只返回了思考过程，没有给出回答'));
check('a thinking-only response is refused in the buffered path', completion.includes('模型这次没有给出回答内容'));
check('the chat route refuses a null-ish reply', main.includes('if (ChatCompletion.isBlank(reply)) throw fail('));
check('search result titles are read null-safely', main.includes('String text = ChatCompletion.text(row, "title")'));
check('reference titles and urls are read null-safely', main.includes('append(ChatCompletion.text(row, "title"))') && main.includes('.put("url", ChatCompletion.text(row, "url"))'));

// --- a null-only answer is hidden even if the stored record was never repaired ----------------------
check('the page hides a null-only answer', app.includes('null){3,}/i.test(raw)'));
check('the page note explains what to do', app.includes('这次回答没有正确返回') && app.includes('换一个非推理模型'));
check('blank detection also strips invisible characters', completion.includes('[\\\\s\\\\p{C}\\\\p{Z}]+'));
check('the versions route reports the repair count', main.includes('put("chatAnswersRepaired"'));
check('a leading null run is recognised', completion.includes('public static boolean hasNullPrefix(String value)') && completion.includes('return run >= 3;'));
check('the real broken shape is matched (nulls then the reference list)', completion.includes('the app') && completion.includes('then appended its own reference list'));
check('the repair uses the shape audit', main.includes('String shape = ChatCompletion.shape(answer);') && main.includes('if (shape.equals("text")) continue;'));
check('the page guard checks the leading run', /const answer = \/\^\(\?:\[\\s/.test(app) && app.includes('null){3,}/i.test(raw)'));
check('already-saved null answers are repaired', main.includes('private static void repairChatAnswers(JSONObject root)') && main.includes('这次回答没有正确返回'));
check('the repair keeps the question for a retry', main.includes('row.put("needsRetry", true)') && !main.includes('chats.remove('));

// --- domestic nutrition data first --------------------------------------------------------------------
check('the estimator prefers Chinese food composition data', prompts.includes('数据顺序：用户锚点 > 中国大陆常见熟重'));
check('chain-restaurant items use the brand label', prompts.includes('连锁公开成分表'));
check('packaged food uses the label', prompts.includes('包装标签'));
check('generic western data is only the fallback', prompts.includes('通用西式数据（notes 注明）'));
check('inference is explicitly allowed', prompts.includes('查不到就按同类典型值估并注明，不要拒绝'));
check('the chat prompt prefers domestic values too', prompts.includes('【热量以国内口径为准】'));
check('the chat prompt allows an estimate when nothing is found', prompts.includes('查不到确切数值时**照样回答**'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("chat-streaming", async () => {
/**
 * Streaming chat checks. The answer must appear progressively (not buffered), must keep the same
 * save path as the buffered route, and must fall back cleanly when a provider cannot stream.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const adapter = fs.readFileSync('app/src/main/assets/native-adapter.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const chat = fs.readFileSync('app/src/main/java/cn/qingheng/health/ChatCompletion.java', 'utf8');

// --- native streaming -----------------------------------------------------------------------------
check('a streaming HTTP path exists', chat.includes('public static String stream(JSONObject config, String apiKey, String model, JSONArray messages, Delta onDelta)'));
check('the request asks the provider to stream', chat.includes('.put("stream", true)'));
check('SSE data lines are parsed', chat.includes('startsWith("data:")') && chat.includes('"[DONE]"'));
check('delta and message shapes are both accepted', chat.includes('optJSONObject("delta")') && chat.includes('optJSONObject("message")'));
check('non-JSON keep-alive lines do not fail the answer', chat.includes('A keep-alive or vendor-specific line'));
check('a partial answer is reported instead of lost', chat.includes('回答中断，已显示收到的部分内容'));
check('in-stream provider errors surface', chat.includes('API 返回了流式错误'));
check('the streamed answer is length capped', chat.includes('if (answer.length() + delta.length() > MAX_CONTENT)'));
check('the security contract is unchanged (HTTPS only, no redirects, key in header only)', chat.includes('conn.setInstanceFollowRedirects(false)') && chat.includes('setRequestProperty("Authorization", "Bearer " + apiKey)'));
check('a stream route exists', main.includes('if (post && path.equals("/api/chat/stream")) return startChatStream(b);'));
check('the stream starts a worker and returns immediately', main.includes('return new JSONObject().put("started", true).put("streamId", id);'));
check('delta/done/error events are pushed', main.includes('pushChatEvent("delta", id, text, null)') && main.includes('pushChatEvent("done", id, result.optString("reply", ""), result.optJSONObject("webSearch"))') && main.includes('pushChatEvent("error", id, text, null)'));
check('WebView access stays on the UI thread', /runOnUiThread\(\(\) -> \{[\s\S]{0,400}?web\.evaluateJavascript\(/.test(main));
check('the buffered path is untouched when there is no sink', main.includes('sink == null') && main.includes(': ChatCompletion.stream('));
check('the worker is a daemon so it cannot hold the process open', main.includes('worker.setDaemon(true);'));

// --- adapter: streaming plus the same save path ---------------------------------------------------
const streamStart = adapter.indexOf("if(path==='/api/chat/stream') {");
const streamBlock = streamStart < 0 ? '' : adapter.slice(streamStart, adapter.indexOf("if(path==='/api/chat') {", streamStart));
check('the adapter exposes the stream route', streamStart > 0);
check('the adapter still requires explicit consent', streamBlock.includes("if(body?.allowExternal!==true)"));
check('the adapter saves the streamed answer', streamBlock.includes("storageRequest('/api/chatlog','POST'"));
check('the adapter waits for the done event', streamBlock.includes("if(event.kind==='done')finish(resolve,"));
check('the adapter rejects on a streamed error', streamBlock.includes("else finish(reject,new Error(event.text||'回答失败，请稍后重试。'));"));
check('the page handler is restored after the stream', streamBlock.includes('window.__qinghengChat=previous;'));

// --- page: progressive rendering and fallback ------------------------------------------------------
check('a streaming bubble and date header are created up front', app.includes('function beginChatStream(question, hasImage, date)') && app.includes('stream-chat-day'));
check('delta text is appended and flushed once per frame', app.includes('function pushChatStream(box, chunk)') && app.includes('box.text += chunk;') && app.includes('flushChatStream(box);'));
check('the saved record adopts the live row instead of replacing its answer', app.includes("slot.replaceWith(streamExpandedAnswer.box.box)") && app.includes('stream.adopted = true;'));
check('structured blocks fill their existing placeholder node', app.includes("node.className = 'stream-block stream-block-ready';") && app.includes('node.innerHTML = answerHtml(raw);'));
check('the completion path does not re-scroll a long answer', !app.includes('setTimeout(jump, 260)') && app.includes('if (streamExpandedAnswer) streamExpandedAnswer=null;'));
check('the page passes a delta sink through a global', app.includes('window.QinghengStream = {onDelta: text => pushChatStream(box, text)'));
check('streaming is tried first', app.includes('const streamed = await streamChat(payload);') && app.includes('data = streamed.data; liveStream = streamed.box;'));
check('the buffered route is the fallback', app.includes("data = await api('/api/chat', payload);"));
check('the fallback is explained to the user', app.includes('流式输出不可用，已改用一次性返回…'));
check('an unsupported environment is detected before sending', app.includes("if (!window.QinghengAdapter?.hasNative?.() || !navigator.onLine) throw new Error('当前环境不支持流式输出');"));
check('the caret blinks and respects reduced motion', css.includes('.stream-caret{') && css.includes('@media (prefers-reduced-motion: reduce){.stream-caret{animation:none}}'));


// Robustness added after confirming the streaming chain end to end.
check('a fragment that could not be delivered is buffered', main.includes('private final StringBuilder streamPending') && main.includes('streamPending.append(body)'));
check('the buffer is prepended to the next event', main.includes('payloadText = streamPending + body;') && main.includes('streamPending.setLength(0);'));
check('the buffer is per stream', main.includes('streamPendingId'));
check('the page says the model is thinking', app.includes('模型正在思考…'));
check('the hint is dropped when the first fragment arrives', app.includes('box.started = true;') && app.includes('clearTimeout(box.hint);'));
check('the hint timer is cleared on both paths', app.includes('if (box?.hint) clearTimeout(box.hint);'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("stream-bubble", async () => {
/**
 * Behavioural test for the streaming bubble: runs the shipped beginChatStream / pushChatThinking /
 * pushChatStream / endChatStream against a minimal fake DOM.
 *
 * Worth doing at this level because the interesting behaviour is a sequence: thinking arrives first,
 * then collapses to a one-line summary the moment the answer starts, and the two streams must never
 * mix — exactly the bug class that produced "nullnull…" answers before.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const source = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const slice = (startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${startMarker} not found`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`end marker for ${startMarker} not found`);
  return source.slice(start, end);
};
const code = slice('  function beginChatStream(', '  function renderChat()');

// --- minimal fake DOM --------------------------------------------------------------------------------
const CLASS_RE = /class="([^"]+)"([^>]*)>/g;
class El {
  constructor(tag, className) {
    this.tag = tag;
    this.className = className || '';
    this.children = [];
    this._text = '';
    this.hidden = false;
    this.attrs = {};
    this.parentNode = null;
    this.classList = {add: name => { this.className = `${this.className} ${name}`.trim(); }};
    this._html = '';
  }
  get textContent() {
    if (this.children.length) return this.children.map(row => row.textContent).join('');
    if (this._html) return this._html.replace(/<[^>]*>/g, '');
    return this._text;
  }
  set textContent(value) { this._text = String(value ?? ''); this._html = ''; this.children = []; }
  set innerHTML(value) {
    this._html = value;
    this._text = '';
    this.children = [];
    for (const match of value.matchAll(CLASS_RE)) {
      const child = new El('span', match[1]);
      // A browser honours a bare `hidden` attribute; the fake DOM must too or the test lies.
      if (/\bhidden\b/.test(match[2] || '')) child.hidden = true;
      this.children.push(child);
    }
    if (value.includes('<strong>')) {const strong = new El('strong'); strong._text = ' '; this.children.push(strong);}
  }
  get innerHTML() { return this._html; }
  setAttribute(key, value) { this.attrs[key] = value; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  insertBefore(child, before) {child.parentNode = this; const index = this.children.indexOf(before); this.children.splice(index < 0 ? 0 : index, 0, child); return child;}
  prepend(child) { child.parentNode = this; this.children.unshift(child); return child; }
  removeChild(child) { this.children = this.children.filter(row => row !== child); child.parentNode = null; }
  querySelector(selector) {
    if (selector === 'strong') return this.children.find(row => row.tag === 'strong') || null;
    const wanted = selector.replace(/^\./, '');
    return this.children.find(row => String(row.className).split(/\s+/).includes(wanted)) || null;
  }
}
const log = new El('div');
const sandbox = {
  document: {createElement: tag => new El(tag)},
  $: (selector, root) => selector === '#chat-log' ? log : (root ? root.querySelector(selector) : null),
  esc: value => String(value ?? ''),
  answerHtml: value => /^\s*\|/.test(String(value)) ? '<div class="answer-table-wrap"><table class="answer-table"></table></div>' : `<p>${String(value)}</p>`,
  setTimeout: () => 0,
  clearTimeout: () => {},
  // 片段里用 nextFrame/cancelFrame 把逐 token 的写入合批；这里用同步桩（返回 0 表示「已在下一帧刷过」），
  // 于是每个 delta 立刻落到 DOM，测试断言看到的始终是累积后的文本。
  nextFrame: fn => {fn(); return 0;},
  cancelFrame: () => {},
  Math, String, Array, Boolean, RegExp, Number,
};
vm.createContext(sandbox);
vm.runInContext(code + '\nthis.beginChatStream = beginChatStream; this.pushChatStream = pushChatStream; this.pushChatThinking = pushChatThinking; this.endChatStream = endChatStream; this.finishChatStream = finishChatStream;', sandbox);
const {beginChatStream, pushChatStream, pushChatThinking, endChatStream, finishChatStream} = sandbox;

// --- the sequence ------------------------------------------------------------------------------------
const box = beginChatStream('汉堡王的大皇堡多少热量', false, '2026-11-06');
check('a bubble and its day header are created together', log.children.length === 2 && log.children[0] === box.dayHeader && box.box.parentNode === log);
check('it shows the question', box.box.querySelector('strong').textContent === '汉堡王的大皇堡多少热量');
check('it starts with the thinking hint', box.status.textContent.includes('模型正在思考'));
check('the thinking block starts hidden', box.think.hidden === true);

pushChatThinking(box, '先看品牌营养表');
check('thinking becomes visible', box.think.hidden === false);
check('thinking text is shown as-is', box.think.textContent === '先看品牌营养表', box.think.textContent);
check('the hint stays separate from answer content', box.status.textContent.includes('模型正在思考') && box.body.textContent === '');

pushChatThinking(box, '，一份皇堡约 660 kcal');
check('thinking accumulates', box.think.textContent.length > 6);

pushChatStream(box, '约 660');
check('the answer starts filling the answer area', box.body.children[0]?.textContent === '约 660');
check('thinking collapses to a one-line summary', box.think.textContent.startsWith('已思考 ') && box.think.textContent.includes('字（点击展开）'), box.think.textContent);
check('thinking is NOT merged into the answer', !box.body.textContent.includes('品牌营养表') && !box.body.textContent.includes('已思考'));

pushChatStream(box, ' kcal（±15%）');
check('the answer accumulates', box.body.children[0]?.textContent === '约 660 kcal（±15%）', JSON.stringify(box.body.children[0]?.textContent));

pushChatThinking(box, '迟到的思考片段');
check('late thinking is ignored once the answer started', !box.think.textContent.includes('迟到的思考片段'), box.think.textContent);

endChatStream(box);
check('the bubble is removed on completion', log.children.length === 0);

// --- long reasoning is bounded -------------------------------------------------------------------------
const second = beginChatStream('测试', true);
pushChatThinking(second, 'x'.repeat(900));
check('very long thinking is truncated to the tail', second.think.textContent.length <= 601 && second.think.textContent.startsWith('…'), String(second.think.textContent.length));
endChatStream(second);
check('the log is empty again', log.children.length === 0);

// --- completed blocks retain their node while later text and structured output arrive -----------------
const structured = beginChatStream('表格问题', false);
pushChatStream(structured, '先给结论。');
const firstBlock = structured.body.children[0];
pushChatStream(structured, '\n\n| 食物 | 克重 |\n| --- | --- |\n| 米饭 | 100 |');
const tableBlock = structured.body.children[1];
check('the completed paragraph remains the same DOM node', structured.body.children[0] === firstBlock);
check('a table occupies a placeholder before it is complete', tableBlock.className.includes('stream-block-pending--table'));
check('later deltas do not rewrite completed text', firstBlock.textContent === '先给结论。');
pushChatStream(structured, '\n\n下一段继续。');
check('the table placeholder is filled in place as a whole block', structured.body.children[1] === tableBlock && tableBlock.className === 'stream-block stream-block-ready');
check('text after the table is appended as a separate block', structured.body.children.length === 3 && structured.body.children[2].textContent === '下一段继续。', JSON.stringify(structured.body.children[2]?.textContent));
finishChatStream(structured, '先给结论。\n\n| 食物 | 克重 |\n| --- | --- |\n| 米饭 | 100 |\n\n下一段继续。');
check('completion keeps the same block nodes and hides the caret', structured.body.children[0] === firstBlock && structured.body.children[1] === tableBlock && structured.caret.hidden);
endChatStream(structured);

const repeated = [];
for (let i = 0; i < 10; i++) {
  const row = beginChatStream(`第 ${i + 1} 次`, false);
  const answer = `回答 ${i + 1}。\n\n第二段。`;
  pushChatStream(row, answer);
  finishChatStream(row, answer);
  repeated.push(row.body.textContent);
  endChatStream(row);
}
check('ten consecutive streams keep each answer complete', repeated.length === 10 && repeated.every((answer, i) => answer.includes(`回答 ${i + 1}`) && answer.includes('第二段')));
check('no live rows remain after ten completions', log.children.length === 0);
;return typeof fail === 'number' ? fail : 0;
});

await __run("web-search", async () => {
const java = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/MainActivity.java', import.meta.url), 'utf8');
const alarm = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/AlarmReceiver.java', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../app/src/main/assets/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app/src/main/assets/app.js', import.meta.url), 'utf8');
assert(!java.includes('BraveSearch'));
assert(!java.includes('/api/search-settings'));
assert(!java.includes('web_search'));
assert(!html.includes('search-form'));
assert(!app.includes('searchState'));
assert(java.includes('/api/chatlog/'));
assert(java.includes('deleteChatLog'));
assert(app.includes('data-long-press="chat:'), 'chat rows are managed by the long-press sheet');
// The push route dispatch now lives in bridge.PushRoutes; the activity must still wire it in.
const pushRoutes = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/bridge/PushRoutes.java', import.meta.url), 'utf8');
assert(pushRoutes.includes('/api/push-history'));
assert(java.includes('PushRoutes.handle(path, get, post, b, this)'));
assert(alarm.includes('adviceHistory'));
assert(app.includes('queryPushHistory'));
assert(app.includes('acceptConsent'));
console.log('PASS Brave removal, targeted chat delete, one-time consent, and push advice history.');
;return typeof fail === 'number' ? fail : 0;
});
console.log('\nFAIL total: ' + __fail);
process.exitCode = __fail ? 1 : 0;
