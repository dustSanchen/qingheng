/*
 * Streaming robustness:
 *  1. a delta that cannot be delivered (page reloading mid-answer) is buffered and prepended to the
 *     next event, so no part of the answer silently disappears from the bubble;
 *  2. the page shows "模型正在思考…" until the first fragment arrives, so a reasoning model's silent
 *     thinking phase does not look like a frozen screen.
 */
import fs from 'node:fs';

function patch(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  const crlf = text.includes('\r\n');
  for (const [label, fromRaw, toRaw] of edits) {
    const from = crlf ? fromRaw.replace(/\n/g, '\r\n') : fromRaw;
    const to = crlf ? toRaw.replace(/\n/g, '\r\n') : toRaw;
    const count = text.split(from).length - 1;
    if (count === 0 && text.includes(to)) { console.log(`skip (already applied)  ${label}`); continue; }
    if (count !== 1) throw new Error(`${file} :: ${label}: expected 1 anchor, found ${count}`);
    text = text.replace(from, to);
    console.log(`ok  ${label}`);
  }
  fs.writeFileSync(file, text);
}

patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'buffered stream events',
    `    /** One streamed event: kind is delta / done / error. Never carries keys or config. */
    private void pushChatEvent(String kind, String id, String text, JSONObject webSearch) {
        final String script;
        try {
            JSONObject payload = new JSONObject().put("streamId", id).put("kind", kind)
                    .put("text", text == null ? "" : text);
            if (webSearch != null) payload.put("webSearch", webSearch);
            script = "window.__qinghengChat && window.__qinghengChat(" + JSONObject.quote(payload.toString()) + ");";
        } catch (Exception e) {
            return;
        }
        runOnUiThread(() -> { if (alive && web != null && pageReady) web.evaluateJavascript(script, null); });
    }`,
    `    /** Text that could not be delivered yet, kept per stream so nothing silently disappears. */
    private final StringBuilder streamPending = new StringBuilder();
    private String streamPendingId = "";

    /** One streamed event: kind is delta / done / error. Never carries keys or config. */
    private void pushChatEvent(String kind, String id, String text, JSONObject webSearch) {
        final String body = text == null ? "" : text;
        runOnUiThread(() -> {
            if (!alive || web == null) return;
            if (!pageReady) {
                // The page is reloading mid-answer: hold the fragment and send it with the next event,
                // otherwise the bubble would silently skip that part of the answer.
                if ("delta".equals(kind)) {
                    if (!id.equals(streamPendingId)) { streamPending.setLength(0); streamPendingId = id; }
                    streamPending.append(body);
                }
                return;
            }
            String payloadText = body;
            if ("delta".equals(kind) && streamPending.length() > 0 && id.equals(streamPendingId)) {
                payloadText = streamPending + body;
                streamPending.setLength(0);
            }
            try {
                JSONObject payload = new JSONObject().put("streamId", id).put("kind", kind).put("text", payloadText);
                if (webSearch != null) payload.put("webSearch", webSearch);
                web.evaluateJavascript("window.__qinghengChat && window.__qinghengChat("
                        + JSONObject.quote(payload.toString()) + ");", null);
            } catch (Exception ignored) { }
        });
    }`,
  ],
]);

patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'thinking hint while the first fragment is pending',
    `    $('strong', box).textContent = question || '（照片提问）';
    log.prepend(box);
    return {box, text: '', body: $('.stream-text', box), caret: $('.stream-caret', box)};
  }
  function pushChatStream(box, chunk) {
    if (!box || !chunk) return;
    box.text += chunk;
    box.body.textContent = box.text;
    box.caret.hidden = false;
  }`,
    `    $('strong', box).textContent = question || '（照片提问）';
    log.prepend(box);
    const state = {box, text: '', body: $('.stream-text', box), caret: $('.stream-caret', box), started: false};
    // A reasoning model can think for a while before the first fragment; say so instead of showing an
    // empty bubble, and drop the hint as soon as real text arrives.
    state.body.textContent = '模型正在思考…';
    state.hint = setTimeout(() => {if (!state.started && state.body) state.body.textContent = '模型正在思考…（推理模型会先思考再作答）';}, 4000);
    return state;
  }
  function pushChatStream(box, chunk) {
    if (!box || !chunk) return;
    if (!box.started) {box.started = true; box.text = ''; clearTimeout(box.hint);}
    box.text += chunk;
    box.body.textContent = box.text;
    box.caret.hidden = false;
  }`,
  ],
  [
    'clear the hint when the stream ends',
    `  function endChatStream(box) {
    if (box?.box?.parentNode) box.box.parentNode.removeChild(box.box);
  }`,
    `  function endChatStream(box) {
    if (box?.hint) clearTimeout(box.hint);
    if (box?.box?.parentNode) box.box.parentNode.removeChild(box.box);
  }`,
  ],
]);

console.log('streaming robustness wired');
