/**
 * Q&A round checks: answers come first, missing sections are skipped instead of blocking an answer,
 * tables fit a phone screen, the answer context carries body and training data, and lookup results
 * that do not match the question are dropped.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const app = read('app/src/main/assets/app.js');
const adapter = read('app/src/main/assets/native-adapter.js');
const css = read('app/src/main/assets/styles.css');

// --- answer first, never refuse ---------------------------------------------------------------------
check('the prompt demands a direct answer first', prompts.includes('【先回答问题】永远先直接回答用户问的那件事'));
check('refusing is explicitly forbidden', prompts.includes('禁止拒答') && prompts.includes('禁止用「无法判断」'));
check('a best-effort answer is required even with partial data', prompts.includes('即使数据不全也要给出你能给的最好答案'));
check('missing sections are skipped silently', prompts.includes('【缺数据就跳过】') && prompts.includes('不要提、不要追问、不要要求用户补齐'));
check('missing is not treated as zero', prompts.includes('数据缺失时不要把缺失当成 0'));
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
check('the filter runs before the model sees anything', main.includes('JSONArray kept = relevantResults(web.optJSONArray("results"), question, searchWords);'));
check('an empty filtered set is treated as no lookup', main.includes('web.put("connected", web.optBoolean("connected") && kept.length() > 0);'));
check('the model is told unrelated hits were dropped', main.includes('检索返回的条目与问题不相关，已全部剔除'));
check('the prompt ignores irrelevant entries instead of changing topic', prompts.includes('若某条与问题无关就忽略它，不要为了用上检索结果而改变话题'));
check('a failed lookup is not mentioned to the user', prompts.includes('检索为空时就用常识与用户记录回答，不要提及检索失败'));

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
check('the estimator prefers Chinese food composition data', prompts.includes('【数据口径优先顺序】') && prompts.includes('中式菜品与家常菜优先按中国大陆常见食物成分口径'));
check('chain-restaurant items use the brand label', prompts.includes('连锁快餐用该品牌公开的营养成分表'));
check('packaged food uses the label', prompts.includes('包装食品用包装标签'));
check('generic western data is only the fallback', prompts.includes('只有中式口径和标签都拿不到时，才用通用的西式食材数据'));
check('inference is explicitly allowed', prompts.includes('【允许推断】查不到确切数值时不要拒绝'));
check('the chat prompt prefers domestic values too', prompts.includes('【热量以国内口径为准】'));
check('the chat prompt allows an estimate when nothing is found', prompts.includes('查不到确切数值时**照样回答**'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
