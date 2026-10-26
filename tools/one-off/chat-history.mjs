/**
 * 第 12 轮：问答记录的「收纳 + 检索 + 回找」。
 *
 * 现状：问答页的「问答记录」是一条不分组的完整列表（倒序），没有搜索，
 * 也没有从今天页回到「上次那条回答」的入口；用几个月后必然翻不到。
 *
 * 做法（只加不拆，避免大改）：
 *  1) 记录卡加搜索框：按问题与回答文本过滤
 *  2) 列表按日期分组，日期做小标题，组内保持倒序
 *  3) 今天页加「上次问答」入口：显示最近一条的问题，点进去定位并展开
 */
import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

// 1) 标记：搜索框 + 今天页入口
patch('app/src/main/assets/index.html', [
  ['chat search field',
   '<div class="heading-actions"><button type="button" class="chip-toggle" id="chat-favorites-only" aria-pressed="false">只看收藏</button><button class="text-button" type="button" id="chat-clear">清空记录</button></div></div><div id="chat-log"></div>',
   '<div class="heading-actions"><button type="button" class="chip-toggle" id="chat-favorites-only" aria-pressed="false">只看收藏</button><button class="text-button" type="button" id="chat-clear">清空记录</button></div></div><label class="chat-search"><span class="visually-hidden">搜索问答记录</span><input type="search" id="chat-search" placeholder="搜索问题或回答里的词" autocomplete="off"></label><div id="chat-log"></div>'],
  ['last chat entry on today',
   '<article class="card" id="daily-three">',
   '<article class="card" id="last-chat-card" hidden><div class="card-heading"><h2>上次问答</h2><span class="tag" id="last-chat-date"></span></div><button type="button" class="hub-row" id="last-chat-open"><span class="hub-text"><span class="hub-title" id="last-chat-question">—</span><span class="hub-summary" id="last-chat-preview">点开看上次 AI 给的完整回答</span></span><span class="hub-arrow" aria-hidden="true">›</span></button></article><article class="card" id="daily-three">'],
]);

// 2) 逻辑：搜索 + 日期分组 + 回找
patch('app/src/fragments/10-rich-answer.fragment.js', [
  ['chat search and grouping',
   '  function renderChat() {\n    const chats = Array.isArray(state.chats) ? state.chats : [];',
   `  let chatQuery = '';
  /** 把记录按日期分组，组内保持倒序（最新在前）。 */
  function groupChatsByDate(rows) {
    const groups = [];
    for (const row of rows) {
      const date = String(row.date || '未标注日期');
      let group = groups.find(item => item.date === date);
      if (!group) { group = {date, rows: []}; groups.push(group); }
      group.rows.push(row);
    }
    return groups;
  }
  function chatMatches(row, query) {
    if (!query) return true;
    const hay = (String(row.question || '') + ' ' + String(row.answer || '')).toLowerCase();
    return hay.includes(query.toLowerCase());
  }
  function renderChat() {
    const chats = Array.isArray(state.chats) ? state.chats : [];`],
  ['renderChat filters and groups',
   '    const shown = favoriteOnlyChats ? chats.filter(row => row.favorite === true) : chats;',
   '    const base = favoriteOnlyChats ? chats.filter(row => row.favorite === true) : chats;\n    const shown = base.filter(row => chatMatches(row, chatQuery));'],
  ['renderChat emits day headers',
   '    if (log) log.innerHTML = shown.length ? [...shown].reverse().map(row => {',
   '    const groups = groupChatsByDate([...shown].reverse());\n    if (log) log.innerHTML = shown.length ? groups.map(group => `<p class="chat-day">${esc(group.date)}<span>${group.rows.length} 条</span></p>` + group.rows.map(row => {'],
  ['close the grouped map',
   '    }).join("") : empty(favoriteOnlyChats ? \'还没有收藏的问答记录。长按一条记录即可收藏。\' : "还没有问答记录。有疑问时，问一句。");',
   '    }).join('')).join("") : empty(chatQuery ? \'没有匹配「\' + chatQuery + \'」的记录。\' : (favoriteOnlyChats ? \'还没有收藏的问答记录。长按一条记录即可收藏。\' : "还没有问答记录。有疑问时，问一句。"));'],
]);

// 3) 今天页入口的渲染与跳转
patch('app/src/fragments/70-rest.fragment.js', [
  ['render the last chat entry',
   "  async function loadStorageStatus(remirror = false) {",
   `  /** 今天页的「上次问答」：只显示最近一条，点开定位到问答页的那一条。 */
  function renderLastChat() {
    const card = $('#last-chat-card');
    if (!card) return;
    const rows = (Array.isArray(state.chats) ? state.chats : []).slice().sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    const last = rows[0];
    if (!last) { card.hidden = true; return; }
    card.hidden = false;
    const date = $('#last-chat-date'); if (date) date.textContent = String(last.date || '');
    const question = $('#last-chat-question'); if (question) question.textContent = String(last.question || '（未记录问题）').slice(0, 42);
    const preview = $('#last-chat-preview'); if (preview) preview.textContent = String(last.answer || '').replace(/\\s+/g, ' ').slice(0, 40) || '点开看完整回答';
    const open = $('#last-chat-open');
    if (open && !open.dataset.wired) {
      open.dataset.wired = '1';
      open.addEventListener('click', () => {
        switchTab('chat');
        const id = String((state.chats && state.chats[state.chats.length - 1] && state.chats[state.chats.length - 1].id) || '');
        if (id) { expandedChats.add(id); renderChat(); const node = document.querySelector('[data-long-press="chat:' + id + '"]'); if (node) node.scrollIntoView({block: 'center'}); }
      });
    }
  }

  async function loadStorageStatus(remirror = false) {`],
  ['wire search input',
   "  installSkinPicker();",
   "  installSkinPicker();\n  const chatSearch = $('#chat-search');\n  if (chatSearch) chatSearch.addEventListener('input', () => { chatQuery = chatSearch.value.trim(); renderChat(); });"],
]);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.chat-day')) {
  css += `
/* Q&A history: a search field and one date header per day, so a long list stays scannable. */
.chat-search{display:block;margin:0 0 var(--space-2)}
.chat-search input{width:100%}
.chat-day{display:flex;justify-content:space-between;gap:var(--space-2);margin:var(--space-3) 0 var(--space-1);padding-top:var(--space-2);border-top:1px solid var(--line);font-size:var(--text-sm);color:var(--muted);font-variant-numeric:tabular-nums}
.chat-day:first-child{border-top:0;padding-top:0;margin-top:0}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  chat-day styles');
}

console.log('chat history wired');
