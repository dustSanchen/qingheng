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
    // 今天页「训练怎么排见 问答 · 训练建议」这类跨页链接：切到问答后顺手选好分段。
    document.addEventListener('click', event => {
      const link = event.target.closest?.('[data-go="chat"][data-chat-panel]');
      if (!link) return;
      const panel = link.dataset.chatPanel === 'training' ? 'training' : 'chat';
      apply(panel);
      try { localStorage.setItem(KEY, panel); } catch (error) { /* 同上 */ }
      if (panel === 'training' && typeof renderTrainingInsights === 'function') renderTrainingInsights();
    });
  }
  if (typeof window !== 'undefined') window.installChatPanels = installChatPanels;
  installChatPanels();
})();
