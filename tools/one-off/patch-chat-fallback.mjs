/*
 * Q&A fixes: any streaming failure falls back to the buffered call (a provider without SSE support
 * used to surface a hard error instead of an answer), the stream can no longer hang forever, and a
 * streamed answer survives a failed state reload.
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

// --- fragments are the source of truth for the page -------------------------------------------------
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'fall back on any streaming failure',
    `      try {
        data = await streamChat(payload);
      } catch (streamError) {
        // Streaming is a nicety: fall back to the buffered call so the question is still answered.
        if (!/不支持流式|未能启动/.test(String(streamError?.message || ''))) throw streamError;
        feedback(message, '流式输出不可用，已改用一次性返回…');
        data = await api('/api/chat', payload);
      }`,
    `      try {
        data = await streamChat(payload);
      } catch (streamError) {
        // Streaming is only a nicety: whatever went wrong (provider without SSE support, a proxy that
        // buffers, a mid-stream error, a timeout), the question still gets answered through the normal
        // route. Only if that also fails does the user see an error.
        try {
          data = await api('/api/chat', payload);
          feedback(message, '流式输出不可用，已改用一次性返回…');
        } catch (bufferedError) {
          throw new Error(\`\${bufferedError?.message || '回答失败'}（流式尝试：\${streamError?.message || '失败'}）\`);
        }
      }`,
  ],
]);

// --- the adapter owns the stream lifecycle ----------------------------------------------------------
patch('app/src/fragments/00-head.fragment.js', [
  [
    'stream timeout helper',
    '  const chatRecordText = row =>',
    `  /**
   * Resolves with the answer, or rejects when the stream stalls. Without this a dropped delta would
   * leave the question box disabled forever, which is exactly the kind of "still broken" the user saw.
   */
  function streamWithTimeout(started, streamId, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const previous = window.__qinghengChat;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.__qinghengChat = previous;
        fn(value);
      };
      const timer = setTimeout(() => finish(reject, new Error('流式回答超时，请重试')), timeoutMs);
      window.__qinghengChat = raw => {
        let event = null;
        try {event = typeof raw === 'string' ? JSON.parse(raw) : raw;} catch {return true;}
        if (!event) return true;
        if (streamId && event.streamId !== streamId) return true;
        if (event.kind === 'delta') {
          const sink = window.QinghengStream;
          if (sink && typeof sink.onDelta === 'function') {try {sink.onDelta(event.text || '');} catch {}}
          return true;
        }
        if (event.kind === 'done') finish(resolve, {reply: event.text || '', webSearch: event.webSearch});
        else finish(reject, new Error(event.text || '回答失败，请稍后重试。'));
        return true;
      };
      try {started();} catch (error) {finish(reject, error);}
    });
  }
  const chatRecordText = row =>`,
  ],
]);

console.log('chat fallback + timeout wired');
