/**
 * P1-4: 答案级「重新生成 / 这条没用 / 来源展开」。
 *
 * 1. 来源随问答记录一起落库（原来只存在当次响应里，刷新就没了）；
 * 2. 流式 done 事件也带上来源，流式与一次性两条路径都能保存；
 * 3. 记录行加三个操作：重新生成、标记没用、展开来源。
 */
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- native ----------------------------
patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'persist sources and feedback on a chat row',
    `        JSONObject saved = new JSONObject().put("id", UUID.randomUUID().toString())
                .put("date", date).put("question", question).put("answer", answer);`,
    `        JSONObject saved = new JSONObject().put("id", UUID.randomUUID().toString())
                .put("date", date).put("question", question).put("answer", answer);
        // Citations are saved with the answer: after a reload the row must still be able to show them.
        JSONArray incoming = entry.optJSONArray("sources");
        if (incoming != null) {
            JSONArray sources = new JSONArray();
            java.util.Set<String> seen = new java.util.HashSet<>();
            for (int i = 0; i < incoming.length() && sources.length() < 6; i++) {
                JSONObject row = incoming.optJSONObject(i);
                if (row == null) continue;
                String url = ChatCompletion.text(row, "url");
                if (!url.startsWith("https://") || !seen.add(url)) continue;
                String title = ChatCompletion.text(row, "title");
                if (title.length() > 120) title = title.substring(0, 120);
                sources.put(new JSONObject().put("url", url).put("title", title)
                        .put("source", ChatCompletion.text(row, "source")));
            }
            if (sources.length() > 0) saved.put("sources", sources);
        }
        String feedback = entry.optString("feedback", "").trim();
        if (feedback.equals("unhelpful") || feedback.equals("helpful")) saved.put("feedback", feedback);`,
  ],
  [
    'streaming done event carries the sources',
    `        return out.put("reply", reply + refs).put("sources", sources);`,
    `        JSONObject webInfo = out.optJSONObject("webSearch");
        if (webInfo != null) webInfo.put("sources", sources);
        return out.put("reply", reply + refs).put("sources", sources);`,
  ],
]);

// ---------------------------------------------------------------- adapter ---------------------------
patch('app/src/main/assets/native-adapter.js', [
  [
    'stream path saves citations',
    `        await storageRequest('/api/chatlog','POST',{entry:{date:localDate(),question:image?\`［含照片］\${question}\`.slice(0,2000):question,answer:String(final?.reply||'')}}).catch(()=>undefined);`,
    `        await storageRequest('/api/chatlog','POST',{entry:{date:localDate(),question:image?\`［含照片］\${question}\`.slice(0,2000):question,answer:String(final?.reply||''),sources:final?.webSearch?.sources||[]}}).catch(()=>undefined);`,
  ],
  [
    'buffered path saves citations',
    `        await storageRequest('/api/chatlog','POST',{entry:{date:localDate(),question:image?\`［含照片］\${question}\`.slice(0,2000):question,answer:String(reply?.reply||'')}}).catch(()=>undefined);`,
    `        await storageRequest('/api/chatlog','POST',{entry:{date:localDate(),question:image?\`［含照片］\${question}\`.slice(0,2000):question,answer:String(reply?.reply||''),sources:reply?.sources||[]}}).catch(()=>undefined);`,
  ],
]);

// ---------------------------------------------------------------- page ------------------------------
patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'row actions and citations',
    `        + \`<div class="answer\${long && !expanded ? ' is-clamped' : ''}">\${answerHtml(answer)}</div>\`
        + \`\${long ? \`<button type="button" class="row-toggle" data-chat-toggle="\${esc(id)}" aria-expanded="\${expanded ? 'true' : 'false'}">\${expanded ? '收起' : '展开全文'}</button>\` : ''}\``,
    `        + \`<div class="answer\${long && !expanded ? ' is-clamped' : ''}">\${answerHtml(answer)}</div>\`
        + \`\${long ? \`<button type="button" class="row-toggle" data-chat-toggle="\${esc(id)}" aria-expanded="\${expanded ? 'true' : 'false'}">\${expanded ? '收起' : '展开全文'}</button>\` : ''}\`
        + citationBlock(row)
        + \`<div class="button-row row-actions"><button type="button" class="button subtle" data-chat-again="\${esc(id)}">重新生成</button><button type="button" class="button subtle" data-chat-unhelpful="\${esc(id)}">\${unhelpfulChats.has(id) ? '已标记没用' : '这条没用'}</button></div>\``,
  ],
  [
    'citation + feedback helpers',
    `  function renderChat() {`,
    `  /** Citations for a saved answer: real https links only, collapsed by default. */
  function citationBlock(row) {
    const sources = Array.isArray(row && row.sources) ? row.sources.filter(item => item && typeof item.url === 'string' && /^https:\\/\\//.test(item.url)) : [];
    if (!sources.length) return '';
    const items = sources.map((item, index) => \`<li><a href="\${esc(item.url)}" target="_blank" rel="noreferrer">[\${index + 1}] \${esc(String(item.title || item.url).slice(0, 90))}</a></li>\`).join('');
    return \`<details class="row-sources"><summary>来源 \${sources.length} 条</summary><ol>\${items}</ol></details>\`;
  }
  /** Rows the user marked as unhelpful; kept on the phone only, as a UI signal. */
  const unhelpfulChats = (() => {
    try {const saved = JSON.parse(localStorage.getItem('qingheng.chat.unhelpful') || '[]'); return new Set(Array.isArray(saved) ? saved.map(String) : []);} catch {return new Set();}
  })();
  function markUnhelpful(id) {
    if (!id) return;
    unhelpfulChats.add(id);
    try {localStorage.setItem('qingheng.chat.unhelpful', JSON.stringify([...unhelpfulChats]));} catch {}
    api('/api/chatlog', {entry: {date: localDate(), question: '（标记）', answer: '（标记）'}}).catch(() => {}); // never blocks the UI
    renderChat();
  }
  /** Refills the question box and, when consent is already given, asks again. */
  async function regenerateChat(id) {
    const row = (state.chats || []).find(item => String(item && item.id) === String(id));
    if (!row) {notice('找不到这条记录，可能已被清除。', true); return;}
    const box = $('#chat-question');
    if (box) {box.value = String(row.question || ''); box.focus();}
    window.scrollTo({top: 0, behavior: 'smooth'});
    const consent = $('#chat-consent');
    if (consent && !consent.hidden && consent.checked) {await sendChat();}
    else notice('问题已填回输入框；勾选同意后点「提问」即可重新生成。');
  }
  function renderChat() {`,
  ],
  [
    'bind the row actions',
    `    if (log) log.addEventListener('click', event => {
      const toggle = event.target.closest('[data-chat-toggle]');`,
    `    if (log) log.addEventListener('click', event => {
      const again = event.target.closest('[data-chat-again]');
      if (again) {event.preventDefault(); regenerateChat(again.dataset.chatAgain).catch(error => notice(error.message, true)); return;}
      const unhelpful = event.target.closest('[data-chat-unhelpful]');
      if (unhelpful) {event.preventDefault(); markUnhelpful(unhelpful.dataset.chatUnhelpful); return;}
      const toggle = event.target.closest('[data-chat-toggle]');`,
  ],
]);

console.log('P1-4 wired');
