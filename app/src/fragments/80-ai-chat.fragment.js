/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */

  // ---- AI 问答与智能教练（80-89 专属层，2026-11-27 起）----------------------------------------
  // 本片段收口问答页的外围接线与对外契约。控制流（sendChat / renderChat / askAiPlan）仍在
  // 10-rich-answer 与 70-rest 里，按 Phase 2b/2c 分步迁入；迁移期间全局函数名保持不变。

  // 问答页分段控制器（原 72-chat-panels.fragment.js，2026-11-27 合并到此）。
  /* 问答页分段：问答 / 训练建议（2026-11-17：今日训练建议从今天页迁到问答页）。
     面板显隐沿用记录页的 .record-panel[hidden] 约定，选择记在 localStorage。 */
  (function () {
    const KEY = 'qingheng.chatPanel';
    const panels = () => [...document.querySelectorAll('#view-chat [data-chat-panel].record-panel')];
    const buttons = () => [...document.querySelectorAll('#chat-tabs [data-chat-panel]')];
    function apply(panel) {
      const want = panel === 'training' ? 'training' : 'chat';
      for (const node of panels()) node.hidden = node.dataset.chatPanel !== want;
      for (const button of buttons()) {
        const on = button.dataset.chatPanel === want;
        button.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
      }
    }
    function installChatPanels() {
      const bar = document.querySelector('#chat-tabs');
      if (!bar || bar.dataset.wired === '1') return;
      bar.dataset.wired = '1';
      let saved = 'chat';
      try { saved = localStorage.getItem(KEY) || 'chat'; } catch (error) { saved = 'chat'; }
      apply(saved);
      bar.addEventListener('click', event => {
        const button = event.target.closest('[data-chat-panel]');
        if (!button) return;
        const panel = button.dataset.chatPanel;
        apply(panel);
        try { localStorage.setItem(KEY, panel); } catch (error) { /* 隐私模式写不进去就算了 */ }
        if (panel === 'training' && typeof renderTrainingInsights === 'function') renderTrainingInsights();
      });
    }
    if (typeof window !== 'undefined') window.installChatPanels = installChatPanels;
    installChatPanels();
  })();

  async function showContextPreview(kind, node, date) {
    if (!node) return;
    if (!window.QinghengAdapter.hasNative()) {node.textContent = '浏览器演示不发送数据到外部模型，因此这里没有可预览的内容。'; return;}
    if (node.dataset.loaded === date) return;
    node.textContent = '正在整理本次将发送的数据…';
    try {
      const payload = {date, kind};
      if (kind === 'advice') payload.preferences = readPreferences();
      const data = await api('/api/context-preview', payload);
      node.textContent = `【系统提示词】\n${data?.system || ''}\n\n【本次数据】\n${JSON.stringify(data?.user ?? null, null, 2)}`;
      node.dataset.loaded = date;
    } catch (error) {node.textContent = error.message;}
  }

  function installContextPreview(panelId, nodeId, kind) {
    const panel = $('#' + panelId);
    if (!panel) return;
    panel.addEventListener('toggle', () => {if (panel.open) showContextPreview(kind, $('#' + nodeId), activeDate).catch(() => {});});
  }

  function installChatFocusReveal() {
    const box = $('#chat-question'), bar = $('.chat-composer'), trainingInput = $('#training-advice-input');
    if (!box || !bar || bar.dataset.wired) return;
    bar.dataset.wired = '1';
    box.addEventListener('focus', () => setTimeout(() => {
      if (bar.isConnected) bar.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }, 320));
    if (trainingInput) trainingInput.addEventListener('focus', () => {
      const submit = trainingInput.closest('form')?.querySelector('button[type="submit"]');
      if (submit) setTimeout(() => submit.scrollIntoView({block: 'nearest', behavior: 'smooth'}), 320);
    });
  }

  function installChatDayFilter() {
    const toggle = $('#chat-day-toggle'), input = $('#chat-day-input');
    if (!toggle || toggle.dataset.wired) return;
    toggle.dataset.wired = '1';
    toggle.addEventListener('click', () => {
      if (!input) return;
      if (typeof input.showPicker === 'function') { try { input.showPicker(); return; } catch {} }
      input.focus(); input.click();
    });
    input?.addEventListener('change', () => {
      const value = /^\d{4}-\d{2}-\d{2}$/.test(input.value) ? input.value : '';
      if (value) setChatDayFilter(value);
      input.value = '';
    });
    $('#chat-day-prev')?.addEventListener('click', () => stepChatDay(-1));
    $('#chat-day-next')?.addEventListener('click', () => stepChatDay(1));
  }

  function installChatTaskOrder() {
    const card = $('#view-chat')?.querySelector('article.card');
    const question = $('#chat-question')?.closest('label');
    const chips = $('#chat-chips');
    const draft = $('#chat-training-draft');
    if (!card || !question || !chips) return;
    question.after(chips);
    if (draft) chips.after(draft);
  }

  function installChatChips() {
    const row = $('#chat-chips'), box = $('#chat-question');
    if (!row || !box) return;
    const presets = ['我今天蛋白够吗？', '今天训练日该怎么吃？', '本周体重趋势怎么样？'];
    row.innerHTML = presets.map((text, index) => `<button type="button" class="button subtle" data-chat-chip="${index}">${esc(text)}</button>`).join("");
    row.scrollLeft = 0;
    row.addEventListener('click', event => {
      const button = event.target.closest('[data-chat-chip]');
      if (!button) return;
      box.value = presets[Number(button.dataset.chatChip)] || '';
      box.focus();
    });
  }

  (function(){
    const box=$('#chat-web'), toggle=$('#chat-web-toggle');
    if(!box) return;
    const paint=()=>{ if(toggle) toggle.setAttribute('aria-pressed', box.checked ? 'true' : 'false'); };
    try{const saved=localStorage.getItem(CHAT_WEB_KEY);if(saved!==null)box.checked=saved==='1';}catch{}
    paint();
    if(toggle) toggle.addEventListener('click',()=>{box.checked=!box.checked;paint();try{localStorage.setItem(CHAT_WEB_KEY,box.checked?'1':'0');}catch{}if (typeof schedulePrefsSync === 'function') schedulePrefsSync({chatWeb: box.checked});});
    box.addEventListener('change',()=>{paint();try{localStorage.setItem(CHAT_WEB_KEY,box.checked?'1':'0');}catch{}
      if (typeof schedulePrefsSync === 'function') schedulePrefsSync({chatWeb: box.checked});
    });
  })();

  // ---- 问答控制流（Phase 2b 从 10-rich-answer 迁入，2026-11-27）--------------------------------
  // 流式控制、历史渲染/分页/按天/收藏、拍照压缩与原生回填桥、sendChat 主流程。
  // 10-rich-answer 只保留富文本渲染与流式气泡骨架。
  /**
   * 把流式回答写进任意容器（今天页的训练建议卡也要有「正在思考」这一段）。
   * 返回 /api/chat/stream 的最终 data；不支持流式时抛错，交给调用方退回一次性接口。
   */
  async function streamInto(container, payload, placeholder = '模型正在思考…') {
    if (!container) throw new Error('缺少输出位置');
    if (!window.QinghengAdapter?.hasNative?.() || !navigator.onLine) throw new Error('当前环境不支持流式输出');
    container.hidden = false;
    container.innerHTML = '<div class="stream-think" hidden></div><span class="stream-text"></span><span class="stream-caret" aria-hidden="true">▍</span>';
    const think = $('.stream-think', container), text = $('.stream-text', container), caret = $('.stream-caret', container);
    text.textContent = placeholder;
    let thinking = '', buffer = '', pending = '', frame = 0, started = false;
    const flush = () => {frame = 0; if (text) text.textContent = pending; if (caret) caret.hidden = false;};
    window.QinghengStream = {
      onThink: chunk => {
        if (started || !chunk || !think) return;
        thinking += chunk;
        think.hidden = false;
        think.textContent = thinking.length > 600 ? '…' + thinking.slice(-600) : thinking;
      },
      onDelta: chunk => {
        if (!chunk) return;
        if (!started) {
          started = true;
          if (think) {
            think.hidden = !thinking;
            if (thinking) {think.textContent = `已思考 ${thinking.length} 字（点击展开）`; think.classList.add('is-summary');}
          }
        }
        buffer += chunk; pending = buffer;
        if (!frame) frame = nextFrame(flush);
      },
    };
    try {
      return await api('/api/chat/stream', payload);
    } finally {
      window.QinghengStream = null;
      if (frame) cancelFrame(frame);
      if (caret) caret.remove();
    }
  }
  /** Streams the answer through the adapter; throws when streaming is unavailable so the caller can fall back. */
  async function streamChat(payload) {
    if (!window.QinghengAdapter?.hasNative?.() || !navigator.onLine) throw new Error('当前环境不支持流式输出');
    const box = beginChatStream(payload.question, Boolean(payload.image), payload.date);
    if (!box) throw new Error('问答记录区域不可用，请重新打开页面后重试。');
    window.QinghengStream = {onDelta: text => pushChatStream(box, text), onThink: text => pushChatThinking(box, text)};
    try {
      const data = await api('/api/chat/stream', payload);
      finishChatStream(box, data?.reply);
      return {data, box};
    } catch (error) {
      endChatStream(box);
      throw error;
    } finally {
      window.QinghengStream = null;
    }
  }
  /** Citations for a saved answer: real https links only, collapsed by default. */
  function citationBlock(row) {
    const sources = Array.isArray(row && row.sources) ? row.sources.filter(item => item && typeof item.url === 'string' && /^https:\/\//.test(item.url)) : [];
    if (!sources.length) return '';
    const items = sources.map((item, index) => `<li><a href="${esc(item.url)}" target="_blank" rel="noreferrer">[${index + 1}] ${esc(String(item.title || item.url).slice(0, 90))}</a></li>`).join('');
    return `<details class="row-sources"><summary>来源 ${sources.length} 条</summary><ol>${items}</ol></details>`;
  }
  /** Rows the user marked as unhelpful; mirrored into /api/prefs so a new phone keeps them. */
  const unhelpfulChats = (() => {
    try {const saved = JSON.parse(localStorage.getItem(CHAT_UNHELPFUL_KEY) || '[]'); return new Set(Array.isArray(saved) ? saved.map(String) : []);} catch {return new Set();}
  })();
  function markUnhelpful(id) {
    if (!id) return;
    unhelpfulChats.add(id);
    try {localStorage.setItem(CHAT_UNHELPFUL_KEY, JSON.stringify([...unhelpfulChats]));} catch {}
    if (typeof schedulePrefsSync === 'function') schedulePrefsSync({unhelpfulChats: [...unhelpfulChats]});
    renderChat();
  }
  /** Refills the question box and, when consent is already given, asks again. */
  async function regenerateChat(id) {
    const row = (state.chats || []).find(item => String(item && item.id) === String(id));
    if (!row) {notice('找不到这条记录，可能已被清除。', true); return;}
    const box = $('#chat-question');
    if (box) {box.value = String(row.question || ''); box.focus();}
    window.scrollTo({top: 0, behavior: 'smooth'});
    if (typeof externalConsent === 'function' && externalConsent()) {await sendChat();}
    else notice('问题已填回输入框；到「我的 → 数据与关于」开启外部模型授权后点「提问」即可重新生成。');
  }
  let chatQuery = "";
  /** 按日期分组，组内保持倒序（最新在前）。 */
  function groupChatsByDate(rows) {
    const groups = [];
    for (const row of rows) {
      const date = String(row.date || "未标注日期");
      let group = groups.find(item => item.date === date);
      if (!group) { group = {date, rows: []}; groups.push(group); }
      group.rows.push(row);
    }
    return groups;
  }
  function chatMatches(row, query) {
    if (!query) return true;
    const hay = (String(row.question || "") + " " + String(row.answer || "")).toLowerCase();
    return hay.includes(query.toLowerCase());
  }
  /** 问答记录分页：默认只渲染最新 30 条，历史长了也不卡。 */
  let chatShownCount = 30;
  const CHAT_PAGE_SIZE = 30;
  let streamExpandedAnswer = null;
  function resetChatPaging() { chatShownCount = CHAT_PAGE_SIZE; }
  function showEarlierChats() { chatShownCount += CHAT_PAGE_SIZE; renderChat(); }
  // ---- 按天查看 ------------------------------------------------------------------------------
  // 历史越长，"更早的记录"越像抽奖。日期 chip 直接筛出某一天，两侧箭头只在有记录的日期之间走，
  // 到最新一天再按一次就回到全部——翻页和按天查询是同一个动作。
  let chatDayFilter = '';
  function chatRowsInScope() {
    const chats = Array.isArray(state.chats) ? state.chats : [];
    const base = favoriteOnlyChats ? chats.filter(row => row.favorite === true) : chats;
    return base.filter(row => chatMatches(row, chatQuery));
  }
  /** 有记录的日期，从新到旧；箭头按这个列表走，不会停在空白的一天。 */
  function chatDates() {
    const dates = [];
    for (const row of chatRowsInScope()) {
      const date = String(row.date || '');
      if (date && !dates.includes(date)) dates.push(date);
    }
    return dates.sort((a, b) => b.localeCompare(a));
  }
  function setChatDayFilter(date) {chatDayFilter = date || ''; resetChatPaging(); renderChat();}
  /** dir=-1 更早，dir=1 更晚。dates 是「从新到旧」，所以更早 = 索引 +1。 */
  function stepChatDay(dir) {
    const dates = chatDates();
    if (!dates.length) return;
    if (!chatDayFilter) { if (dir < 0) setChatDayFilter(dates[0]); return; }
    const index = dates.indexOf(chatDayFilter);
    if (index < 0) {setChatDayFilter(''); return;}
    const target = index - dir;
    if (target < 0) {setChatDayFilter(''); return;}
    setChatDayFilter(dates[Math.min(target, dates.length - 1)]);
  }
  function renderChatDayBar() {
    const toggle = $('#chat-day-toggle'), prev = $('#chat-day-prev'), next = $('#chat-day-next');
    if (!toggle) return;
    const dates = chatDates();
    const index = chatDayFilter ? dates.indexOf(chatDayFilter) : -1;
    toggle.textContent = chatDayFilter ? chatDayFilter.slice(5) : '全部日期';
    toggle.setAttribute('aria-pressed', chatDayFilter ? 'true' : 'false');
    toggle.setAttribute('aria-label', chatDayFilter ? `正在看 ${chatDayFilter}，点开换一天` : '按天查看问答记录');
    if (prev) prev.disabled = !dates.length || (index === dates.length - 1);
    // 「全部日期」已经在最新一端，再往后没有更晚的了。
    if (next) next.disabled = !dates.length || index < 0;
  }
  function adoptStreamChatRow(stream, row) {
    const live = stream?.box;
    if (!live || !row) return false;
    const id = String(row.id ?? ''), question = String(row.question || ''), answerText = String(row.answer || '');
    live.className = 'meal-row list-row';
    live.setAttribute('data-long-press', `chat:${id}`);
    const head = $('.row-head', live), title = $('strong', live), answer = $('.stream-answer', live);
    if (!head || !title || !answer) return false;
    title.textContent = question;
    Array.from(head.querySelectorAll('.row-tag,.fav-badge')).forEach(tag => tag.remove());
    const addTag = text => {const tag = document.createElement('span'); tag.className = 'row-tag'; tag.textContent = text; head.appendChild(tag);};
    if (question.includes('含照片')) addTag('含照片');
    if (/联网检索|参考来源|来源（联网/.test(answerText)) addTag('联网检索');
    if (row.favorite === true) {
      const badge = document.createElement('span'); badge.className = 'fav-badge'; badge.setAttribute('aria-label', '已收藏');
      const icon = document.createElement('span'); icon.className = 'inline-icon'; icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = SVG_ICONS['icon-bookmark.svg']; badge.appendChild(icon); head.appendChild(badge);
    }
    answer.className = 'answer';
    for (const selector of ['.stream-think','.stream-status','.stream-caret']) {
      const child = $(selector, answer); if (child?.parentNode) child.parentNode.removeChild(child);
    }
    if (answerText.length > 140) {
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'row-toggle-inline';
      toggle.dataset.chatToggle = id; toggle.setAttribute('aria-expanded', 'true'); toggle.textContent = '收起';
      answer.parentNode.insertBefore(toggle, answer.nextSibling);
      expandedChats.add(id);
    }
    const sources = citationBlock(row);
    if (sources) {
      const holder = document.createElement('div'); holder.innerHTML = sources;
      while (holder.firstChild) answer.parentNode.appendChild(holder.firstChild);
    }
    stream.adopted = true;
    return true;
  }
  function renderChat() {
    const log = $('#chat-log');
    const shown = chatRowsInScope();
    const dayRows = chatDayFilter ? shown.filter(row => String(row.date || '') === chatDayFilter) : shown;
    // No inline delete here: a long press opens copy / select / favourite / delete instead, so the
    // row keeps its width for the question, its tags, the date and a readable answer preview.
    const ordered = [...dayRows].reverse();
    const visible = ordered.slice(0, chatShownCount);
    const earlier = ordered.length - visible.length;
    const groups = groupChatsByDate(visible);
    const moreButton = earlier > 0
      ? `<button type="button" class="button subtle full-width" data-chat-more>更早的记录（还有 ${earlier} 条）</button>`
      : '';
    if (log) log.innerHTML = shown.length ? groups.map(group => "<p class=\"chat-day\">" + esc(group.date) + "<span>" + group.rows.length + " 条</span></p>" + group.rows.map(row => {
      // An answer that is nothing but JSON nulls ("nullnull…") is not an answer: say what happened
      // instead of showing the raw text, even if the stored record was never repaired.
      const raw = String(row.answer || '');
      const answer = /^(?:[\s\u200b-\u200f\u2060\ufeff]*null){3,}/i.test(raw)
        ? '这次回答没有正确返回（模型只输出了思考过程）。请重新提问；反复出现请换一个非推理模型。'
        : raw;
      if (streamExpandedAnswer && row.question === streamExpandedAnswer.question && answer === streamExpandedAnswer.answer) {
        streamExpandedAnswer.row = row;
        return '<div class="stream-slot" aria-hidden="true"></div>';
      }
      const id = String(row.id ?? '');
      const expanded = expandedChats.has(id);
      const long = answer.length > 140;
      const tags = []
        .concat(String(row.question || '').includes('含照片') ? ['含照片'] : [])
        .concat(/联网检索|参考来源|来源（联网/.test(answer) ? ['联网检索'] : [])
        .concat(row.source === 'api' ? [] : [])
        .join('');
      // 日期只在分组标题出现一次；行内不再重复。操作收进长按菜单，行里只留「展开全文」这个
      // 读的动作，所以一屏能多看一条记录。
      return `<div class="meal-row list-row" role="listitem" data-long-press="chat:${esc(id)}"><div class="row-body">`
        + `<div class="row-head"><strong>${esc(row.question || '')}</strong>`
        + `${row.favorite === true ? `<span class="fav-badge" aria-label="已收藏"><span class="inline-icon" aria-hidden="true">${SVG_ICONS['icon-bookmark.svg']}</span></span>` : ''}`
        + `${tags ? `<span class="row-tag">${esc(tags)}</span>` : ''}`
        + `</div>`
        + `<div class="answer${long && !expanded ? ' is-clamped' : ''}">${answerHtml(answer)}</div>`
        + `${long ? `<button type="button" class="row-toggle-inline" data-chat-toggle="${esc(id)}" aria-expanded="${expanded ? 'true' : 'false'}">${expanded ? '收起' : '展开全文'}</button>` : ''}`
        + citationBlock(row)
        + `</div></div>`;
    }).join("")).join("") + moreButton : empty(chatQuery ? "没有匹配「" + chatQuery + "」的记录。" : (favoriteOnlyChats ? "还没有收藏的问答记录。长按一条记录即可收藏。" : (chatDayFilter ? chatDayFilter + " 没有问答记录。" : "还没有问答记录。有疑问时，问一句。")));
    if (log && streamExpandedAnswer?.row) {
      const slot = $('.stream-slot', log);
      if (slot && adoptStreamChatRow(streamExpandedAnswer.box, streamExpandedAnswer.row)) slot.replaceWith(streamExpandedAnswer.box.box);
      streamExpandedAnswer = null;
    }
    renderChatDayBar();
    const node = $('#chat-mode');
    if (node) {
      const base = state.settings.apiConfigured === true
        ? '已配置模型：外发开关与授权在「我的 → 数据与关于」；问题与部分健康数据会发给该服务商，按 token 计费。'
        : '尚未配置 API Key：请先到「我的 → AI 模型与密钥」保存密钥；本地记录功能不受影响。';
      node.textContent = base;
    }
  }
  // ---- 上次训练建议（今天页训练卡的入口行）--------------------------------------------------------
  // 训练问答故意不写进全局问答历史（logToHistory:false），所以单独存一份，只在这里回看；
  // 这样训练卡不会再把饮食类问答当成「上次回答」。
  const LAST_TRAINING_KEY = 'qingheng.lastTrainingAdvice';
  function readLastTrainingAdvice() {
    try {
      const raw = localStorage.getItem(LAST_TRAINING_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      return saved && saved.answer ? saved : null;
    } catch { return null; }
  }
  function saveLastTrainingAdvice(question, answer) {
    if (!answer) return;
    try {
      localStorage.setItem(LAST_TRAINING_KEY, JSON.stringify({
        date: localDate(), question: String(question || '').slice(0, 200),
        answer: String(answer).slice(0, 8000)
      }));
    } catch { }
  }
  /** Fills the "上次训练建议" row; stays hidden until a training question has been answered. */
  function renderLastChat() {
    const open = $('#last-chat-open');
    if (!open) return;
    const last = readLastTrainingAdvice();
    open.hidden = !last;
    if (!last) return;
    const question = $('#last-chat-question'), preview = $('#last-chat-preview');
    if (question) question.textContent = String(last.question || '（未记录问题）').slice(0, 42);
    if (preview) {
      const text = String(last.answer || '').replace(/\s+/g, ' ').trim();
      preview.textContent = text ? text.slice(0, 48) : '点开看上次训练建议的完整回答';
    }
  }
  $('#last-chat-open')?.addEventListener('click', () => {
    const last = readLastTrainingAdvice();
    const box = $('#training-advice-answer');
    if (!last || !box) return;
    box.hidden = false;
    box.innerHTML = answerHtml(last.answer);
    box.scrollIntoView({block: 'start', behavior: 'smooth'});
  });
  let chatImage = null, chatImageVersion = 0, chatImageBusy = false;
  function clearChatImage() {lastCaptureId='';chatPhotoMeta=photoMeta(null);chatImageVersion++;chatImage=null;chatImageBusy=false;$('#chat-image').value='';$('#chat-gallery').value='';$('#chat-image-preview').hidden=true;$('#chat-image-view').removeAttribute('src');}
  $('#chat-image').addEventListener('change', async event => {
    const file = event.target.files[0], message = $('#chat-feedback');
    if (!file) {clearChatImage(); return;}
    const revision = ++chatImageVersion;
    chatImage = null; chatImageBusy = true;
    feedback(message,'正在本地压缩照片…');
    try {
      const result = await compressImage(file);
      if (revision !== chatImageVersion) return;
      chatImage = result; chatPhotoMeta=photoMeta(null); showPhotoTime('chat',chatPhotoMeta);
      $('#chat-image-view').src = result;
      $('#chat-image-preview').hidden = false;
      feedback(message,'照片已压缩为 JPEG，原始元数据不会上传。');
    } catch (error) {
      if (revision === chatImageVersion) {clearChatImage(); feedback(message,error.message,true);}
    } finally {if (revision === chatImageVersion) chatImageBusy = false;}
  });
  $('#chat-image-remove').addEventListener('click',()=>{clearChatImage();feedback($('#chat-feedback'),'已移除照片。');});
  // Tell the native layer which field opened the camera, so a recovered capture lands in the right place.
  const declareImageTarget = target => {try {const bridge = window.QinghengNative; if (bridge && typeof bridge.imageTarget === 'function') bridge.imageTarget(target);} catch {}};
  ['#meal-image','#meal-gallery'].forEach(id=>$(id).addEventListener('click',()=>declareImageTarget('meal')));
  ['#chat-image','#chat-gallery'].forEach(id=>$(id).addEventListener('click',()=>declareImageTarget('chat')));
  // The Android layer hands a capture back here when the page had to reload while the camera was open.
  window.__qinghengPendingImage = payload => {
    let parsed;
    try {parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;} catch {return false;}
    if (!parsed || !['chat','meal'].includes(parsed.target) || typeof parsed.data !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(parsed.data)) return false;
    if (parsed.id && parsed.id === lastCaptureId) return true;
    if (parsed.target === 'chat') {
      chatImageVersion++; chatImageBusy = false; chatImage = parsed.data; chatPhotoMeta=photoMeta(parsed); showPhotoTime('chat',chatPhotoMeta);
      $('#chat-image-view').src = parsed.data; $('#chat-image-preview').hidden = false;
      switchTab('chat');
      feedback($('#chat-feedback'),'照片已就绪，已压缩并移除元数据。');
      $('#chat-image-preview').scrollIntoView({block:'nearest',behavior:'auto'});
    } else {
      syncCalendarDay(); imageVersion++; imageBusy = false; imageData = parsed.data; mealPhotoMeta=photoMeta(parsed); showPhotoTime('meal',mealPhotoMeta);
      $('#meal-image-preview').src = parsed.data; $('#image-preview').hidden = false;
      switchTab('records');
      feedback($('#estimate-feedback'),'照片已就绪，已压缩并移除元数据。确认同意后可生成估算预览。');
      $('#image-preview').scrollIntoView({block:'nearest',behavior:'auto'});
    }
    lastCaptureId = parsed.id || '';
    return true;
  };
  window.__qinghengImageError = message => notice(String(message), true);
  async function sendChat() {
    const button = $('#chat-send'), message = $('#chat-feedback'), question = $('#chat-question').value.trim();
    if (button.disabled) return;
    if (chatImageBusy) {feedback(message,'照片还在压缩，请稍等一下。',true); return;}
    if (!question && !chatImage) {feedback(message,'请先写下你的问题，或拍一张照片。',true); $('#chat-question').focus(); return;}
    if (question.length > 2000) {feedback(message,'问题请控制在 2000 字以内。',true); return;}
    // A finished sentence becomes a draft card; local recognition must not require external consent.
    // parseDraft 覆盖体重/睡眠/步数/饮水/训练五类；餐食用 parseMealDraft 单独兜底。两者都只出草稿，
    // 写入仍要用户点确认（餐食则走估算预览）。
    if (typeof parseDraft === 'function' || typeof parseTrainingDraft === 'function') {
      let draft = typeof parseDraft === 'function' ? parseDraft(question, activeDate) : parseTrainingDraft(question, activeDate);
      if (!draft && typeof parseMealDraft === 'function') draft = parseMealDraft(question, activeDate);
      if (draft) showTrainingDraft(draft); else renderTrainingDraft(null);
    }
    if (!externalConsent()) {feedback(message,'请先到「我的 → 数据与关于」开启外部模型授权。',true); return;}
    if (chatImage && (state.settings.apiConfigured !== true || state.settings.visionEnabled !== true || !state.settings.visionModel)) {feedback(message,'带照片提问需要已启用的视觉模型：DeepSeek 请使用 deepseek-flash，B.AI 请填写其支持图片的模型。',true); return;}
    if (!navigator.onLine) {feedback(message,'当前离线；可先记录数据，联网后再问。',true); return;}
    // 同一时刻只跑一条 AI 流（见 80-ai-chat 的 claimAiChatStream）：两条会互相覆盖回调。
    if (typeof claimAiChatStream === 'function' && !claimAiChatStream('chat')) {feedback(message,'另一条 AI 请求还在进行，等它结束后再问。',true); return;}
    syncCalendarDay();
    const submittedImage = chatImage, submittedPhotoMeta = photoMeta(chatPhotoMeta), submittedDate = activeDate;
    button.disabled = true; feedback(message, submittedImage ? '正在上传照片并思考，请稍候…' : '正在思考，请稍候…');
    let liveStream = null;
    try {
      const history = (Array.isArray(state.chats) ? state.chats : []).slice(-5).flatMap(row => [{role:'user',content:String(row.question || '').slice(0,4000)},{role:'assistant',content:String(row.answer || '').slice(0,4000)}]);
      // Routing rule: a short question with no lookup intent is answered in the fast tier.
      const deepIntent = /(检索|搜索|查一下|最新|研究|证据|为什么|原理|对比|论文|指南|训练|练了|练什么|动作|组数|体重|体脂|蛋白|热量|吃了|睡眠|数据)/.test(question);
      const tier = !submittedImage && !deepIntent && question.length <= 24 ? 'fast' : 'deep';
      const payload = {question,history,date:submittedDate,allowExternal:true,anchors:anchorSummary(),tier,library:(libraryLookup(question, 8) || librarySummary(6)),webSearch:$('#chat-web').checked && navigator.onLine && tier === 'deep',...(submittedImage?{image:submittedImage,...submittedPhotoMeta}:{})};
      let data = null;
      try {
        const streamed = await streamChat(payload);
        data = streamed.data; liveStream = streamed.box;
      } catch (streamError) {
        // Streaming is only a nicety: whatever went wrong (a provider without SSE support, a proxy that
        // buffers, a mid-stream error, a timeout), the question still gets answered through the normal
        // route. Only if that also fails does the user see an error.
        try {
          data = await api('/api/chat', payload);
          feedback(message, '流式输出不可用，已改用一次性返回…');
        } catch (bufferedError) {
          throw new Error(`${bufferedError?.message || '回答失败'}（流式尝试：${streamError?.message || '失败'}）`);
        }
      }
      const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
      if (!reply) throw new Error('模型没有返回可读取的回答，请重试。');
      const sourceUrls = Array.isArray(data?.sources) ? data.sources.map(row => row && row.url).filter(url => typeof url === 'string' && /^https:\/\//.test(url)) : [];
      const withSources = reply;
      const stored = submittedImage ? `［含照片］${question}`.slice(0,2000) : question;
      let receivedMessage = data?.webSearch
        ? (data.webSearch.connected ? '已收到回答，已联网检索（' + data.webSearch.via + '，检索词：' + (data.webSearch.query || '') + '）。' : '已收到回答，但本次未能联网检索。')
        : (tier === 'fast' ? '已收到回答（快速档：不联网、只带最近三天数据）。' : '已收到回答。');
      if (data?.webSearch?.authorityLimited) receivedMessage += ' 未找到高权威来源，具体数值请核对。';
      feedback(message, receivedMessage);
      $('#chat-question').value = ''; acceptConsent('chat'); clearChatImage();
      if (liveStream) streamExpandedAnswer={question:stored,answer:withSources,box:liveStream};
      try {await loadState({quiet:true});} catch {
        // 落库失败也不能让刚显示出来的气泡消失：把它原地接管成历史行，再补一条内存记录。
        const localRow = {id: 'local-' + Date.now(), date: localDate(), question: stored, answer: withSources};
        state.chats = [...(Array.isArray(state.chats) ? state.chats : []), localRow];
        if (liveStream) { try { adoptStreamChatRow(liveStream, localRow); } catch {} liveStream.adopted = true; }
        notice('回答已显示，但保存到手机失败，请勿重复提问。', true);
      }
      if (streamExpandedAnswer) streamExpandedAnswer=null;
    } catch (error) {
      if (liveStream) endChatStream(liveStream);
      streamExpandedAnswer=null;
      feedback(message,error.message,true);
    } finally {if(liveStream)endChatStream(liveStream);if(typeof releaseAiChatStream === 'function')releaseAiChatStream('chat');button.disabled = false;}
  }

  // ---- 智能教练（Phase 2c 从 70-rest 迁入，2026-11-27）------------------------------------------
  // 今日清单存储、排课上下文编译、笔记/重量规则、askAiPlan 流式排课、训练建议窗口与三条洞察。
  function aiPlanStore(date, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(AI_PLAN_KEY(date)) || "null");
      localStorage.setItem(AI_PLAN_KEY(date), JSON.stringify(value));
      // 收进 state.json：备份/迁移带着走（保存时立即同步，清除时同样落库）。
      if (typeof schedulePrefsSync === 'function') schedulePrefsSync({aiPlans: collectedAiPlans()});
    } catch { return null; }
  }
  /** 总组数：新计划直接用 sets，旧数据从 dose 里读回。 */
  function aiPlanSets(item) {
    const n = Number(item && item.sets);
    if (Number.isFinite(n) && n > 0) return n;
    const hit = /(\d+)\s*组/.exec(String((item && item.dose) || ""));
    return hit ? Number(hit[1]) : 0;
  }
  function planItemMinutes(item) {
    const cardio = number(item && item.durationMin);
    if (cardio !== null && cardio > 0) return cardio;
    const sets = aiPlanSets(item);
    if (!sets) return 0;
    const name = String((item && item.name) || "");
    const rest = typeof restSecondsFor === "function" ? restSecondsFor(name) : 90;
    return sets * (AI_PLAN_WORK_SECONDS + rest) / 60;
  }
  /** 整份清单的实际占用（含组间休息），向上取整到分钟。 */
  function planMinutes(items) {
    const total = (Array.isArray(items) ? items : []).reduce((sum, item) => sum + planItemMinutes(item), 0);
    return total > 0 ? Math.ceil(total) : 0;
  }
  /**
   * 近期强度信号：近 7 天「累」两次以上、或最近一次就是太累 → 降一档；
   * 一次都没喊累、而「太轻」两次以上 → 加一档；其余保持。
   */
  function effortSignal() {
    const rows = [];
    for (let offset = 0; offset < 10; offset++) {
      const value = effortFor(shiftDay(activeDate, -offset));
      if (value) rows.push({date: shiftDay(activeDate, -offset), value});
    }
    const recent = rows.filter(row => {
      const gap = Math.round((new Date(activeDate + "T00:00:00") - new Date(row.date + "T00:00:00")) / 86400000);
      return gap <= 7;
    });
    const heavy = recent.filter(row => row.value === "tired" || row.value === "tooMuch").length;
    const light = recent.filter(row => row.value === "tooLight").length;
    const last = rows[0] ? rows[0].value : null;
    if (last === "tooMuch" || heavy >= 2) return {level: "deload", last, heavy, light, text: "近 7 天有 " + heavy + " 次练到累，这次总量下调一档"};
    if (light >= 2 && heavy === 0) return {level: "push", last, heavy, light, text: "近 7 天有 " + light + " 次觉得太轻，这次加一档"};
    return {level: "keep", last, heavy, light, text: last ? "上次练下来：" + EFFORT_LABELS[last] : ""};
  }
  /**
   * 今日清单的「控件同步」：清单本体已经播进执行区（2026-11-22），这里只维护
   * 「重排今天」文案、顺延按钮的显隐，以及教练说明与失败原因两行。
   * 2026-11-23 Phase 2：删掉 #ai-plan-list / #ai-plan-fold / #ai-plan-edit / #ai-plan-all /
   * #ai-plan-clear / #ai-plan-summary 的渲染——这些节点在 index.html 里早已不存在，
   * 相关分支永远不会命中（约 160 行僵尸代码）。
   */
  function syncAiPlanControls() {
    renderPlanNote();
    renderPlanTiming();
    const plan = aiPlanStore(activeDate);
    const hasPlan = !!(plan && plan.length);
    const ask = $("#ai-plan-ask");
    if (ask) {
      ask.textContent = hasPlan ? "重排今天" : "AI 排今天";
      ask.setAttribute("aria-label", hasPlan ? "让 AI 重新排今天的动作顺序" : "让 AI 排今天的动作顺序");
    }
    const postpone = $("#ai-plan-postpone");
    if (postpone) postpone.hidden = !hasPlan;
  }
  /** 兼容入口：清单数据一变就同步控件（名字沿用，调用点与断言都还认它）。 */
  function renderAiPlan() {
    syncAiPlanControls();
  }
  /** 一行模型返回 → 计划条目；完整解析与流式预览共用同一套字段裁剪。 */
  /**
   * 模型常常只给第一个动作写重量；缺重量时用该动作最近一次记录补，
   * 否则「用 AI 排今天」会出现只有杠铃卧推有 kg、其余动作空着的清单。
   */
  /**
   * 重量三层兜底（2026-11-19，1.4.44）：模型给了就用（落到装得出来的档位），
   * 没给就用本地记忆/同族迁移/体重比例算一个——以前只认 14 天内的同名记录，
   * 于是「用 AI 排今天」经常只有第一个动作有 kg。
   */
  function planWeightFor(row) {
    const raw = Number(row && row.weight);
    if (Number.isFinite(raw) && raw > 0) {
      const kg = typeof loadableWeightKg === "function" ? loadableWeightKg(row.name, raw) : raw;
      return {weight: kg, source: "model"};
    }
    const planned = typeof plannedWeightFor === "function" ? plannedWeightFor(row && row.name) : null;
    if (planned && Number(planned.weight) > 0) return {weight: planned.weight, source: planned.source};
    // 推断不出来时按器械给保守起步值（与 38 号周计划同一套：杠铃 40 / 哑铃 8 / 器械 20 / 其它 10）。
    // 以前这里会留空，AI 排出来的配重动作到了保存校验就被「配重动作还要填负重」拦住整份清单（2026-11-23 用户报）。
    const bodyweight = typeof isBodyweightMove === "function" && isBodyweightMove(row && row.name);
    if (bodyweight) return {weight: null, source: "bodyweight"};
    const gear = typeof exerciseEquip === "function" ? exerciseEquip(row && row.name) : "";
    const START = {barbell: 40, dumbbell: 8, machine: 20};
    return {weight: START[gear] || 10, source: "gear"};
  }
  function planItemFromRow(row) {
    const guess = planWeightFor(row);
    return {
      name: String(row.name).trim().slice(0, 60),
      sets: Number(row.sets) > 0 ? Math.round(Number(row.sets)) : 0,
      reps: Number(row.reps) > 0 ? Math.round(Number(row.reps)) : 0,
      weight: guess.weight,
      weightSource: guess.source,
      weightApprox: guess.source === "gear" || guess.source === "family" || guess.source === "inferred",
      distanceKm: Number(row.distanceKm) > 0 ? Number(row.distanceKm) : null,
      durationMin: Number(row.durationMin) > 0 ? Number(row.durationMin) : null,
      reason: String(row.reason || "").slice(0, 60),
      ...(row.note ? {note: String(row.note).slice(0, 60)} : {}),
      source: "ai",
      done: false
    };
  }
  /** 模型偶尔会裹 ```json、末尾多一个逗号、或先寒暄两句：按括号配对取数组，再宽松解析。 */
  function parseAiPlanReply(reply) {
    const text = String(reply || "").replace(/```[a-zA-Z]*/g, "").trim();
    const start = text.indexOf("[");
    if (start < 0) return [];
    let depth = 0, end = -1, inString = false, escaped = false;
    for (let i = start; i < text.length; i++) {
      const ch = text.charAt(i);
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === "[") depth += 1;
      else if (ch === "]") { depth -= 1; if (!depth) { end = i; break; } }
    }
    if (end < 0) return [];
    const slice = text.slice(start, end + 1).replace(/,\s*([\]}])/g, "$1");
    let rows;
    try { rows = JSON.parse(slice); } catch { return []; }
    if (!Array.isArray(rows)) return [];
    // 组数与有氧距离都为空的行仍是合法动作（用户随后自己填），不在这里删。
    return rows.filter(row => row && String(row.name || "").trim()).slice(0, 12).map(planItemFromRow);
  }
  /**
   * 排课上下文（1.4.47）：把规则与数据在本地算成一张卡，提示词不再逐条贴原始记录。
   * 两份收益：prompt 变短（token），外发的原始数据变少（隐私）。
   */
  function compilePlanContext(date) {
    const prefs = typeof planPrefs === "function" ? planPrefs() : null;
    const profile = state.profile || {};
    const preset = typeof GOAL_PRESETS === "object" ? GOAL_PRESETS[profile.goal] : null;
    const minutes = Number(prefs && prefs.minutes) > 0 ? Number(prefs.minutes) : 45;
    const gear = prefs ? (typeof GEAR_LABELS === "object" && GEAR_LABELS[prefs.gear] ? GEAR_LABELS[prefs.gear] : prefs.gear) : null;
    const template = typeof dayTemplateNote === "function" ? dayTemplateNote(date) : "";
    const done = exercisesFor(date).filter(item => item && item.name).map(item => item.name);
    // 近 28 天有动作记录的天数：用来在等待时给用户一个真实进度（「已取 N 天记录」）。
    let recordDays = 0;
    for (let offset = 0; offset < 28; offset++) {
      if (exercisesFor(shiftDay(date, -offset)).some(item => item && item.name)) recordDays += 1;
    }
    // 只给该部位相关的基线：跨部位的历史对今天没帮助，还会把 prompt 撑长。
    // 部位判定与部位→正则表都收在 55 领域层（planPartFor / PLAN_PART_PATTERNS），这里不再另写一套。
    const family = typeof planPartFor === 'function'
      ? (PLAN_PART_PATTERNS[planPartFor(template)] || /.*/) : /.*/;
    const memory = typeof seedWeightMemoryFromHistory === "function" ? Object.values(seedWeightMemoryFromHistory()) : [];
    const baselines = memory.filter(row => row && Number(row.weight) > 0 && family.test(String(row.name || "")))
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 3)
      .map(row => row.name + " " + (row.sets ? row.sets + "x" : "") + (row.reps || 8) + " " + row.weight + "kg");
    const sets = preset && preset.muscleSetsPerWeek ? preset.muscleSetsPerWeek : [6, 10];
    const reps = preset && preset.reps ? preset.reps : [8, 12];
    const rir = preset && preset.rir ? preset.rir : [1, 3];
    const lines = [
      "本次上下文（本地已按记录算好，直接按它排）：",
      "- 部位：" + (template || "按轮换"),
      "- 时长：" + minutes + " 分钟（含热身与组间休息，总组数按这个时长装）",
      "- 每部位组数：" + sets[0] + "~" + sets[1] + " 组；次数 " + reps[0] + "~" + reps[1] + "；RIR " + rir[0] + "~" + rir[1],
      "- 目标：" + (typeof GOAL_LABEL === "object" ? (GOAL_LABEL[profile.goal] || "未填") : "未填") + "；体重：" + (profile.weight || "未填") + " kg" + (gear ? "；器械：" + gear : ""),
      baselines.length ? "- 该部位基线：" + baselines.join("；") : "- 该部位基线：没有记录，按体重比例给起步重量",
      done.length ? "- 今天已记录：" + done.join("、") : "- 今天还没有训练记录"
    ];
    return {date, minutes, template, baselines, done, recordDays, sets, text: lines.join("\n")};
  }
  /**
   * 本地校验器（1.4.47）：规则搬出提示词之后，必须在这里兜住。
   * 重量落到可装档位、组数收到 1~5、超时长从末尾动作减组（至少留第一个动作）。
   */
  function validatePlanAgainstContext(plan, context) {
    if (!Array.isArray(plan)) return plan;
    for (const item of plan) {
      if (!item) continue;
      if (Number(item.weight) > 0 && typeof loadableWeightKg === "function") {
        const kg = loadableWeightKg(item.name, Number(item.weight));
        if (kg > 0) item.weight = kg;
      }
      if (Number(item.sets) > 5) item.sets = 5;
      if (!(Number(item.sets) >= 1)) item.sets = 1;
    }
    const limit = Number(context && context.minutes) > 0 ? Number(context.minutes) : 45;
    let guard = 0;
    while (typeof planMinutes === "function" && planMinutes(plan) > limit + 3 && guard < 16) {
      guard += 1;
      const shrinkable = plan.filter(item => item && !item.bodyweight && !(Number(item.distanceKm) > 0) && Number(item.sets) > 1);
      if (!shrinkable.length) break;
      const last = shrinkable[shrinkable.length - 1];
      last.sets = Number(last.sets) - 1;
    }
    return plan;
  }
  async function askAiPlan(button) {
    if (!button) return;
    if (!externalConsent()) { notice("请先到「我的 → 数据与关于」开启外部模型授权。"); return; }
    // window.QinghengStream 是单实例：同时再跑一条 AI 请求会互相覆盖，先占位。
    if (typeof claimAiChatStream === "function" && !claimAiChatStream("plan")) {
      notice("另一条 AI 请求还在进行，等它结束后再排。");
      return;
    }
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "正在排…";
    showBusy("正在排今天的动作顺序…", "plan-busy");
    // 首包要等十几秒：把等待拆成可读的阶段，能用真实数字的地方就用真实数字。
    const waitStarted = Date.now();
    let planStageInfo = null;
    let planShownRows = 0;
    const tickTimer = setInterval(() => {
      if (planShownRows > 0) return; // 流式已开始，文案交给 onDelta
      const waited = Math.round((Date.now() - waitStarted) / 1000);
      if (planStageInfo && waited < 3) {
        showBusy("已取 " + (planStageInfo.recordDays || 0) + " 天记录、" + (planStageInfo.baselines.length || 0) + " 条基线，正在排…", "plan-busy");
      } else if (planStageInfo && waited < 8) {
        showBusy("正在按你的口径排（" + planStageInfo.minutes + " 分钟 · 每部位 " + planStageInfo.sets[0] + "~" + planStageInfo.sets[1] + " 组）…已等 " + waited + " 秒", "plan-busy");
      } else if (waited < 15) {
        showBusy("模型在思考，一般 10~15 秒…已等 " + waited + " 秒", "plan-busy");
      } else {
        showBusy("模型还在排，已等 " + waited + " 秒（不用重点）", "plan-busy");
      }
    }, 1000);
    // 慢的时候要说清还在等模型，别让按钮无声地停在「正在排…」。
    const slowTimer = setTimeout(() => showBusy("模型还在排，一般要半分钟左右，请再等一会儿…", "plan-busy"), 12000);
    const planBefore = aiPlanStore(activeDate) || [];
    // 流式期间收到的全文要留一份：后端 done 事件偶尔不带 reply，只剩 deltas；
    // 不给这份兜底，最后一步会解析出空清单、把刚画出来的动作全清掉（2026-11-23 用户报「排了但存不了」）。
    let streamedText = "";
    // 本地计时：慢的时候要能说清是「模型第一句就慢」还是「写得长」，别靠感觉。
    const planStarted = Date.now();
    let planFirstRowAt = 0;
    try {
      // 素材也放在 try 里：任何一步抛错都要落进 catch，不能让按钮卡死在「正在排…」。
      const prefs = typeof planPrefs === "function" ? planPrefs() : null;
      const profile = state.profile || {};
      const done = exercisesFor(activeDate).filter(item => item && item.name).map(item => item.name + " " + (item.sets || "") + "x" + (item.reps || ""));
      // 用户对今天的要求：原样交给模型，让它按教练视角判断要不要照办（不无条件服从）。
      const requestBox = $("#plan-request");
      const requestText = String((requestBox && requestBox.value) || "").trim().slice(0, 200);
      // 规则与数据先在本地编译成一张上下文卡；提示词不再贴原始记录（token 与隐私双赢）。
      const context = compilePlanContext(activeDate);
      planStageInfo = context;
      const library = typeof librarySummary === "function" ? librarySummary(2) : "";
      // 部位只有一个来源：与问答的「训练建议」共用 dayTemplateNote，别再各猜一次。
      const rotationText = typeof dayTemplateNote === "function" ? dayTemplateNote(activeDate) : "";
      const prompt = [
        "请为今天排一个按顺序执行的训练清单。",
        rotationText,
        "信息：目标=" + (GOAL_LABEL[profile.goal] || "未填") + "；体重=" + (profile.weight || "未填") + "kg；每周练=" + (prefs && prefs.days ? prefs.days : (plannedSessions() || "未填")) + "；分化=" + (prefs ? prefs.split : "未填") + "；器械=" + (prefs ? (typeof GEAR_LABELS === "object" && GEAR_LABELS[prefs.gear] ? GEAR_LABELS[prefs.gear] : prefs.gear) : "未填")
          + "；时长=" + (prefs ? prefs.minutes : 45) + " 分钟。"
          + (prefs && prefs.gear === "mixed" ? "器械不限，清单里混用杠铃、哑铃、器械与自重，不要只用一种。" : ""),
        context.text,
        library ? "训练规则（必须遵守）：\n" + library : "",
        (() => {
          const signal = effortSignal();
          if (!signal.text) return "";
          const rule = signal.level === "deload" ? "按降载排：每个配重动作少一组，重量不超过上次，有氧保持不变。"
            : signal.level === "push" ? "按加量排：第一个复合动作多给一组，其余保持。"
              : "按上次节奏排，不要因为一次反馈就大改。";
          return "最近强度反馈（用户自己点的）：" + signal.text + "。" + rule;
        })(),
        requestText ? "用户今天的要求（可能不专业，需要你判断）：" + requestText : "",
        requestText ? "判断原则：先保目标口径（部位轮换、每周组数、时长预算）与安全。要求合理就照办；会挤爆时长、违背轮换或增加受伤风险就不照办，改成更合适的安排，并把一句不超过 40 字的原因写进第一个动作的 note 字段。没有上述情况时不要输出 note。" : "",
        "每个动作的 reason 只写一句、不超过 8 个字，写为什么排它；动作总数按上面的时长装，宁少勿多。",
        "负重（每个配重动作都必须给 weight，不要留空）：①上面有同名记录就按渐进给——上次做到 8 次以上进一档（上肢 +2.5 kg、下肢 +5 kg），6~7 次持平，5 次以下退一档；②只有同族动作的记录就按它的 85% 估；③完全没记录就按体重起步：杠铃卧推 0.5 倍体重、深蹲 0.6、硬拉 0.7、划船 0.45、肩推 0.3，哑铃按单手减半，器械取杠铃的 0.8 倍。",
        "重量要装得出来：杠铃 = 20 kg 空杆 + 每侧 2.5 kg 的整数倍（如 60、65、70），不要给 62.5 这种装不出的数；哑铃按 2 kg、器械按 5 kg 递增。",
        "自重动作（引体向上、俯卧撑、双杠臂屈伸、平板支撑、卷腹）weight 留空，用次数表达进步。",
        "只输出 JSON 数组，第一个字符是 [，不要解释、不要代码块标记。"
      ].filter(Boolean).join("\n");
      // focus:"plan" 走后端专用的「只出 JSON」提示词；tier:"fast" 会追加「最多 3 句」，与 JSON 直接冲突。
      const payload = {question: prompt, date: activeDate, webSearch: false, focus: "plan", allowExternal: true, logToHistory: false};
      let data;
      try {
        // 边流边画：模型每吐完一个动作就先出现在列表里，不用盯着空列表等整段结束。
        let streamed = "", shown = 0;
        window.QinghengStream = {onDelta: chunk => {
          if (!chunk) return;
          streamed += chunk;
          streamedText += chunk;
          const rows = partialPlanRows(streamed);
          if (rows.length > shown) {
            shown = rows.length;
            planShownRows = rows.length;
            if (!planFirstRowAt) planFirstRowAt = Date.now();
            aiPlanStore(activeDate, rows.slice(0, 12).map(planItemFromRow));
            renderAiPlan();
            showBusy("已排好 " + shown + " 个动作，继续中…", "plan-busy");
          }
        }};
        data = await api("/api/chat/stream", payload);
      } catch (streamError) {
        // 流式不可用（浏览器演示、断网、服务商不支持）：退回一次性接口，行为与旧版一致。
        // 已经画出动作时不清空：那份清单用户看得见，退回一次性接口失败也不该让它消失。
        if (!planShownRows) {
          aiPlanStore(activeDate, planBefore);
          renderAiPlan();
        }
        showBusy("模型还在排，请再等一会儿…", "plan-busy");
        data = await api("/api/chat", payload);
      } finally {
        window.QinghengStream = null;
      }
      const finalText = String(data && data.reply ? data.reply : streamedText);
      let plan = validatePlanAgainstContext(applyEffortSignalToPlan(parseAiPlanReply(finalText)), context);
      if (!plan.length) {
        // done 事件没带 reply 时，退回流式期间收到的全文再解析一次。
        plan = validatePlanAgainstContext(applyEffortSignalToPlan(parseAiPlanReply(streamedText)), context);
      }
      if (!plan.length) {
        // 一份都没解析出来：把原来的清单放回去，别让用户白等还丢计划。
        aiPlanStore(activeDate, planBefore);
        renderAiPlan();
        throw new Error("模型这次没有给出清单，原清单已保留；请再点一次重试。");
      }
      aiPlanStore(activeDate, plan);
      // 教练说明：模型把「为什么不完全照办」写进第一个动作的 note，单独取出来显示。
      // 优先用已解析的行（JSON.parse 已经处理过转义）；取不到再在原文里扫一遍 note 的值，
      // 手写扫描而不是正则：正则里的引号会被源码切片脚本误当成字符串边界（测试里踩过）。
      let noteText = plan.map(item => item && item.note).find(Boolean) || "";
      if (!noteText) {
        const marker = '"note"';
        const at = finalText.indexOf(marker);
        const colon = at >= 0 ? finalText.indexOf(':', at + marker.length) : -1;
        const open = colon >= 0 ? finalText.indexOf('"', colon) : -1;
        if (open >= 0) {
          let out = '', escaped = false;
          for (let i = open + 1; i < finalText.length && out.length < 120; i += 1) {
            const ch = finalText.charAt(i);
            if (escaped) { out += ch; escaped = false; continue; }
            if (ch === '\\') { escaped = true; continue; }
            if (ch === '"') break;
            out += ch;
          }
          noteText = out.trim();
        }
      }
      writePlanNote(activeDate, String(noteText || "").slice(0, 60));
      // 清单落库同时把重量记进本地记忆：下次排课同名动作直接按上次表现渐进。
      if (typeof rememberPlanWeights === "function") rememberPlanWeights(plan);
      renderAiPlan();
      // 计划只写进 aiPlanStore 不够：执行区要重新播种成可勾选的行，否则用户看到的是空表单、
      // 按「保存训练」只会提示「还没有动作可保存」——这就是「排了但存不了」的现场（2026-11-23）。
      if (typeof renderTrainingLog === "function") renderTrainingLog();
      // 今日页的「今日清单」读的是同一份数据，排完必须一起刷，否则两个页面各说各话。
      if (typeof renderAdviceOrder === "function") renderAdviceOrder();
      // 模型偶尔只回一两个动作：留着重排的入口，但要说清"这次偏少"，别让用户以为本该如此。
      const wantMinutes = Number(prefs && prefs.minutes ? prefs.minutes : 45) || 45;
      // 耗时写进提示与本地缓存：慢的时候能分开「首条就慢」和「写得长」。
      const planTotalMs = Date.now() - planStarted;
      const firstMs = planFirstRowAt ? planFirstRowAt - planStarted : null;
      // 本地校验后的真实结果也写进去：几个动作、几组、折算多少分钟、上限多少。
      const planSets = plan.reduce((sum, item) => sum + (Number(item && item.sets) || 0), 0);
      const planNeed = typeof planMinutes === "function" ? planMinutes(plan) : null;
      const timingText = "（耗时 " + (planTotalMs / 1000).toFixed(1) + " 秒" + (firstMs !== null ? "，首条 " + (firstMs / 1000).toFixed(1) + " 秒" : "") + "）";
      try { localStorage.setItem("qingheng.planTiming." + activeDate, JSON.stringify({total: planTotalMs, first: firstMs, rows: plan.length, sets: planSets, minutes: planNeed, limit: context.minutes, chars: finalText.length, at: new Date().toISOString()})); } catch {}
      if (typeof renderPlanTiming === "function") renderPlanTiming();
      if (plan.length < 3 && wantMinutes >= 30) {
        notice("模型这次只排了 " + plan.length + " 个动作，比 " + wantMinutes + " 分钟的量少；可以点「修改」补动作，或再点一次重排。" + timingText);
      } else {
        notice("已按顺序排好今天的 " + plan.length + " 个动作" + timingText + "。");
      }
    } catch (error) {
      // 失败也要留证据：toast 会消失，卡片上这行不会。
      try { localStorage.setItem("qingheng.planTiming." + activeDate, JSON.stringify({total: Date.now() - planStarted, first: null, rows: 0, error: String(error && error.message ? error.message : error).slice(0, 80), at: new Date().toISOString()})); } catch {}
      renderAiPlan();
      notice("排训练顺序失败：" + (error && error.message ? error.message : "未知错误"));
    } finally {
      clearInterval(tickTimer);
      clearTimeout(slowTimer);
      button.disabled = false;
      button.textContent = original;
      hideBusy();
      if (typeof releaseAiChatStream === "function") releaseAiChatStream("plan");
    }
  }
  function installAiPlan() {
    const ask = $("#ai-plan-ask");
    if (!ask || ask.dataset.wired) return;
    ask.dataset.wired = "1";
    ask.addEventListener("click", () => askAiPlan(ask));
    const postpone = $("#ai-plan-postpone");
    if (postpone && !postpone.dataset.wired) {
      postpone.dataset.wired = "1";
      postpone.addEventListener("click", () => {
        const plan = aiPlanStore(activeDate) || [];
        if (!plan.length) return;
        const tomorrow = shiftDay(activeDate, 1);
        aiPlanStore(tomorrow, plan.map(item => ({...item, done: false})));
        aiPlanStore(activeDate, []);
        renderAiPlan();
        // 顺延后执行区还挂着已经顺延走的动作：表单与今日清单都要立刻重绘，否则今天仍能照着练。
        if (typeof renderTrainingLog === "function") renderTrainingLog();
        if (typeof renderAdviceOrder === "function") renderAdviceOrder();
        notice("已把这份清单顺延到 " + tomorrow.slice(5) + "，今天不再安排。");
      });
    }
    renderAiPlan();
  }
  /**
   * Three things the log can answer without any model call: which lift stopped moving, what to swap it
   * for, and whether this week's volume is a deload candidate. Reuses weeklyVolume() so the Monday
   * boundary and the volume formula stay in one place.
   */
  function trainingInsights() {
    const rows = typeof weeklyVolume === 'function' ? weeklyVolume() : [];
    const swaps = {'深蹲': '腿举', '卧推': '上斜哑铃卧推', '硬拉': '罗马尼亚硬拉', '划船': '引体向上', '肩推': '侧平举', '腿举': '保加利亚分腿蹲', '推举': '哑铃肩推'};
    const insights = [];
    // 负荷判定与趋势页共用 acwrFromDailyLoads，不再各算一套：卡片说「偏高」而趋势页说「正常」是最伤信任的那种不一致。
    const load = typeof acwrFromDailyLoads === 'function' && typeof dailyLoads === 'function'
      ? acwrFromDailyLoads(dailyLoads(28), activeDate) : null;
    if (load && Number.isFinite(load.ratio)) {
      if (load.flag === 'high') insights.push({tag: '负荷', text: `近 7 天训练负荷是近 4 周周均的 ${load.ratio} 倍，偏高；本周减载或安排一天完全休息`});
      else if (load.flag === 'low' && load.ratio > 0) insights.push({tag: '负荷', text: `近 7 天负荷只有平时的 ${load.ratio} 倍，偏低；停练或减量时优先保住蛋白摄入与睡眠`});
    }
    for (const row of rows) {
      if (!(row.prevVolume > 0) || row.lastVolume > row.prevVolume * 1.02) continue;
      const swap = swaps[row.name];
      insights.push({tag: '停滞', text: `${row.name} 连续两周没有进步（${fmt(row.prevVolume,0)} → ${fmt(row.lastVolume,0)} kg 容量）${swap ? `，可以换成 ${swap} 练 4~6 周` : ''}`});
    }
    let last = 0, prev = 0;
    for (const row of rows) {last += row.lastVolume; prev += row.prevVolume;}
    if (prev > 0 && last > prev * 1.25) insights.push({tag: '容量', text: `本周总容量比上周高 ${fmt((last / prev - 1) * 100, 0)}%；如果连着两周都这样，下周减量 40% 当 deload`});
    if (!insights.length) {
      const trained = trainedOn(localDate());
      insights.push({tag: '状态', text: trained ? '今天已训练；容量连续两周上升，说明渐进超负荷在生效。' : '今天还没记录训练；练完记一条，下周就能看出哪个动作停了。'});
    }
    return insights.slice(0, 3);
  }
  /** Renders those insights into the 今天-page training card. */
  function renderTrainingInsights() {
    const box = $('#training-advice-insights');
    if (!box) return;
    box.innerHTML = trainingInsights().map(item =>
      `<div class="adv-insight"><span class="adv-insight-tag">${esc(item.tag)}</span><p>${esc(item.text)}</p></div>`
    ).join('');
  }
  /** 流式期间只认已经闭合的 {...}，先画出来；最后仍以完整数组为准。 */
  function partialPlanRows(text) {
    const source = String(text || "");
    const start = source.indexOf("[");
    if (start < 0) return [];
    const rows = [];
    let depth = 0, objStart = -1, inString = false, escaped = false;
    for (let i = start; i < source.length; i++) {
      const ch = source.charAt(i);
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === "{") { if (depth === 0) objStart = i; depth += 1; }
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0 && objStart >= 0) {
          try {
            const row = JSON.parse(source.slice(objStart, i + 1));
            if (row && String(row.name || "").trim()) rows.push(row);
          } catch { }
          objStart = -1;
        }
      }
    }
    return rows;
  }
  let lastTrainingReply = "";
  function installTrainingAdvice() {
    const form = $('#training-advice-form'), input = $('#training-advice-input');
    const answerBox = $('#training-advice-answer'), feedbackBox = $('#training-advice-feedback'), chips = $('#training-advice-chips');
    if (!form || !input) return;
    const presets = ['今天练什么最划算？', '只有 40 分钟，怎么排？', '昨晚没睡好，今天强度怎么调？'];
    if (chips) chips.innerHTML = presets.map((text, index) => `<button type="button" class="button subtle" data-training-preset="${index}">${esc(text)}</button>`).join('');
    if (chips) chips.addEventListener('click', event => {
      const button = event.target.closest('[data-training-preset]');
      if (!button) return;
      input.value = presets[Number(button.dataset.trainingPreset)] || '';
      input.focus();
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question) {feedback(feedbackBox, '先写一句要问的训练问题。', true); return;}
      if (!externalConsent()) {feedback(feedbackBox, '请先到「我的 → 数据与关于」开启外部模型授权。', true); return;}
      if (typeof claimAiChatStream === 'function' && !claimAiChatStream('advice')) {feedback(feedbackBox, '另一条 AI 请求还在进行，等它结束后再问。', true); return;}
      feedback(feedbackBox, '正在生成…');
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      // P0：部位与「排今天」同源。dayTemplateNote 在没有周计划时给空串，问题照原样发。
      const templateNote = typeof dayTemplateNote === 'function' ? dayTemplateNote(localDate()) : '';
      const questionWithNote = templateNote ? templateNote + '\n' + question : question;
      // 训练建议走流式，和问答页一样能看到「正在思考…」与逐字输出；不支持时退回一次性接口。
      const payload = {question: questionWithNote, focus: 'training', date: localDate(), allowExternal: true, anchors: anchorSummary(), preferences: readPreferences(), webSearch: false, logToHistory: false};
      try {
        let data = null;
        if (answerBox) {answerBox.hidden = false; answerBox.innerHTML = '';}
        try {
          data = await streamInto(answerBox, payload);
        } catch (streamError) {
          feedback(feedbackBox, '流式输出不可用，正在一次性生成…');
          data = await api('/api/chat', payload);
        }
        const reply = String(data && data.reply || '').trim();
        if (!reply) throw new Error('模型没有返回可读的回答，请重试。');
        if (answerBox) {
          answerBox.hidden = false;
          answerBox.innerHTML = answerHtml(reply)
            + '<div class="button-row" id="training-advice-addrow"><button type="button" class="button subtle" id="training-advice-add">把回答里的动作加入今天的训练</button></div>';
          lastTrainingReply = reply;
          if (typeof saveLastTrainingAdvice === 'function') saveLastTrainingAdvice(question, reply);
          if (typeof renderLastChat === 'function') renderLastChat();
          nextFrame(() => {if (answerBox.isConnected) answerBox.scrollIntoView({block: 'start', behavior: 'smooth'});});
          const addButton = $("#training-advice-add");
          if (addButton) addButton.addEventListener("click", async () => {
            const parsed = parseExercisesFromText(lastTrainingReply);
            if (!parsed.length) { notice("这段回答里没有识别到「动作 + 组×次 + 重量」的写法，可以在下面的训练日志里手动记。", true); return; }
            // 从散文里猜出来的动作要先给人看一眼，确认后再写库——猜错比不做更糟。
            const lines = parsed.map(item => "· " + item.name
              + (item.sets ? " " + item.sets + "组" : "")
              + (item.reps ? " × " + item.reps + "次" : "")
              + (item.weight ? " " + item.weight + " kg" : "")).join("\n");
            const go = await askConfirm("识别到 " + parsed.length + " 个动作：\n" + lines
              + "\n\n要把它们加入今天的训练记录吗？",
              {title: "加入训练记录", ok: "加入", cancel: "先不加"});
            if (!go) return;
            addExercisesToToday(parsed).catch(() => {});
          });
        }
        feedback(feedbackBox, '');
      } catch (error) {
        feedback(feedbackBox, error.message, true);
      } finally {
        if (button) button.disabled = false;
        if (typeof releaseAiChatStream === 'function') releaseAiChatStream('advice');
      }
    });
  }
  let aiChatStreamOwner = '';
  /** 同一时刻只允许一条 AI 流：全局 window.QinghengStream 是单实例，并发会互相覆盖。 */
  function claimAiChatStream(label) {
    if (aiChatStreamOwner) return false;
    aiChatStreamOwner = String(label || 'chat');
    return true;
  }
  function releaseAiChatStream(label) {
    if (aiChatStreamOwner === String(label || 'chat')) aiChatStreamOwner = '';
  }

  /** 幂等初始化：问答页的所有外围接线只在这里挂一次（dataset 标记防重复）。 */
  function installAiChatModule() {
    const root = typeof document !== 'undefined' ? document.querySelector('#view-chat') : null;
    if (!root || root.dataset.aiChatWired === '1') return false;
    root.dataset.aiChatWired = '1';
    const installers = [window.installChatPanels, installChatChips, installChatFocusReveal, installChatDayFilter, installChatTaskOrder];
    for (const install of installers) {
      if (typeof install !== 'function') continue;
      try { install(); } catch (error) { console.warn('[ai-chat] 安装失败', install.name, error); }
    }
    return true;
  }
  if (typeof window !== 'undefined') window.installAiChatModule = installAiChatModule;

  // 对外契约：只暴露函数，数据一律走查询函数（QH.define 会冻结这份对象）。
  if (typeof QH !== 'undefined' && QH && typeof QH.define === 'function' && !QH.has('chat')) {
    QH.define('chat', {
      sendChat,
      renderChat,
      askAiPlan,
      renderTrainingInsights,
      readLastTrainingAdvice,
      installAiChatModule,
      claimAiChatStream,
      releaseAiChatStream,
      streamOwner: () => aiChatStreamOwner,
      draftKinds: () => Object.keys(DRAFT_KINDS)
    });
  }

