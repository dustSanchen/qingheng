/**
 * P1-4 page side: row actions and citations. The click delegation for chat rows lives in
 * 70-rest.fragment.js, so the two new buttons are handled there rather than with a new listener.
 */
import {patch} from '../lib/patch.mjs';

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
]);

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'handle the two new row actions',
    `  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-chat-toggle]');`,
    `  document.addEventListener('click', event => {
    const again = event.target.closest('[data-chat-again]');
    if (again) {event.preventDefault(); regenerateChat(again.dataset.chatAgain).catch(error => notice(error.message, true)); return;}
    const unhelpful = event.target.closest('[data-chat-unhelpful]');
    if (unhelpful) {event.preventDefault(); markUnhelpful(unhelpful.dataset.chatUnhelpful); return;}
    const toggle = event.target.closest('[data-chat-toggle]');`,
  ],
]);

console.log('P1-4 page side wired');
