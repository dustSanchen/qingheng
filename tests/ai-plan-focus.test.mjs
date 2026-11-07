/**
 * 「用 AI 排今天」曾经报「模型这次没有给出回答内容（可能只返回了思考过程）」：
 * 通用问答人设要求「最多 3 句」，用户消息却要「只输出 JSON 数组」，模型两头不讨好，只回了思考过程。
 * 这一轮的契约：清单请求走独立提示词与独立预算，空回答自动重试一次，前端不再被一个抛错卡死按钮。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const rest = read('app/src/fragments/70-rest.fragment.js');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');

// --- client: one dedicated request -------------------------------------------------------------------
// 窗口而不是 indexOf('\n  }\n')：检出时是 CRLF，按 LF 切片会把函数切空。
const planBody = rest.slice(rest.indexOf('async function askAiPlan'));
const planFn = planBody.slice(0, 6000);
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

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
