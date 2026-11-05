/**
 * AI upgrade checks: reasoning models expose thinking separately, retrieval runs several queries and
 * de-duplicates, the answer keeps a fixed shape, and the 薄肌 plan travels with the question.
 */
import fs from 'node:fs';

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
check('thinking is never appended to the answer', completion.includes('if (!thinking.isEmpty() && onThink != null) onThink.onDelta(thinking);') && !/answer\.append\(thinking\)/.test(completion));
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
check('it gives protein and deficit numbers', prompts.includes('2.2~2.4 g/kg') && prompts.includes('10~15%'));
check('it gives training and lifestyle doses', prompts.includes('每肌群 10~20 组/周') && prompts.includes('步数 8000~10000'));
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

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
