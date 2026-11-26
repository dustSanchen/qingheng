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

