/**
 * Streaming chat checks. The answer must appear progressively (not buffered), must keep the same
 * save path as the buffered route, and must fall back cleanly when a provider cannot stream.
 */
import fs from 'node:fs';

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
check('a streaming bubble is created up front', app.includes('function beginChatStream(question, hasImage)'));
check('delta text is appended and flushed once per frame', app.includes('function pushChatStream(box, chunk)') && app.includes('box.pending = box.text;') && app.includes('box.frame = nextFrame(() => {'));
check('the bubble is removed once the saved record renders', app.includes('function endChatStream(box)'));
check('the page passes a delta sink through a global', app.includes('window.QinghengStream = {onDelta: text => pushChatStream(box, text)'));
check('streaming is tried first', app.includes('data = await streamChat(payload);'));
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
console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
