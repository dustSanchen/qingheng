/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- Voice input ----------------------------------------------------------------------------
  // Mainstream health apps keep the microphone inside the field and show a listening sheet with the
  // text appearing as it is recognised, plus explicit stop and cancel. The system recogniser screen
  // cannot be styled, so the app runs SpeechRecognizer itself and falls back to that screen only
  // when the platform has no in-app recogniser.
  const voice = {target:null, partial:'', active:false, retry:false, timer:null};
  const voiceBridge = () => window.QinghengNative || null;
  const voiceInputFor = target => target === 'quick' ? $('#quick-record-text') : $('#meal-text');
  function insertVoiceText(target, text) {
    const input = voiceInputFor(target), value = String(text || '').trim();
    if (!input || !value) return false;
    input.value = input.value.trim() ? `${input.value.trim()}、${value}` : value;
    input.focus();
    return true;
  }
  function setVoiceStatus(text) {const node = $('#voice-status'); if (node) node.textContent = text;}
  function voiceButton(primary) {
    const button = $('#voice-done');
    if (!button) return;
    button.textContent = primary ? '重试' : '完成';
  }
  function closeVoiceSheet() {
    const sheet = $('#voice-sheet'); if (sheet) sheet.hidden = true;
    if (voice.timer) {clearTimeout(voice.timer); voice.timer = null;}
    voice.active = false; voice.retry = false; voice.partial = '';
    const text = $('#voice-text'); if (text) text.textContent = '';
  }
  function systemVoiceFallback(bridge) {
    if (!bridge || typeof bridge.startVoiceInput !== 'function') {
      setVoiceStatus('这台设备没有可用的语音识别；可以直接输入食物与克重。');
      return;
    }
    closeVoiceSheet();
    try {bridge.startVoiceInput(voice.target || 'meal');}
    catch {notice('无法启动语音输入，可以直接输入食物与克重。', true);}
  }
  function beginListening() {
    const bridge = voiceBridge();
    if (!bridge) {setVoiceStatus('语音输入需要已安装的 APK；浏览器演示里可以直接打字。'); return;}
    setVoiceStatus('正在聆听…');
    voiceButton(false);
    $('#voice-text').textContent = '';
    // The in-app recogniser is tried first; "unavailable" comes back through the state callback
    // and hands over to the system screen, so the microphone never becomes a dead end.
    try {bridge.startVoice(voice.target || 'meal');}
    catch {systemVoiceFallback(bridge); return;}
    if (voice.timer) clearTimeout(voice.timer);
    voice.timer = setTimeout(() => {if (voice.active) setVoiceStatus('还在听…说完点「完成」，或点「取消」。');}, 12000);
  }
  function openVoiceSheet(target) {
    const sheet = $('#voice-sheet');
    if (!sheet) return;
    voice.target = target === 'quick' ? 'quick' : 'meal';
    voice.active = true; voice.partial = ''; voice.retry = false;
    sheet.hidden = false;
    beginListening();
  }
  $('#voice-cancel').addEventListener('click', () => {
    const bridge = voiceBridge();
    if (bridge && typeof bridge.cancelVoice === 'function') {try {bridge.cancelVoice();} catch {}}
    closeVoiceSheet();
  });
  $('#voice-done').addEventListener('click', () => {
    if (voice.retry) {voice.retry = false; beginListening(); return;}
    const text = voice.partial.trim();
    if (text) {insertVoiceText(voice.target, text); closeVoiceSheet(); notice('已把语音识别结果填入输入框，可再修改。'); return;}
    const bridge = voiceBridge();
    setVoiceStatus('正在识别…');
    if (bridge && typeof bridge.stopVoice === 'function') {try {bridge.stopVoice();} catch {}}
  });
  window.__qinghengVoicePartial = payload => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const text = String(data?.text || '').trim();
      if (!text) return false;
      voice.partial = text;
      const node = $('#voice-text'); if (node) node.textContent = text;
      setVoiceStatus('正在识别…');
      return true;
    } catch {return false;}
  };
  window.__qinghengVoiceState = payload => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const state = String(data?.state || '');
      if (state === 'listening') setVoiceStatus('正在聆听…');
      else if (state === 'ready') setVoiceStatus('请开始说，例如「米饭 100 克、鸡胸肉 150 克」。');
      else if (state === 'speaking') setVoiceStatus('听到了，继续说…');
      else if (state === 'processing') setVoiceStatus('正在识别…');
      else if (state === 'unavailable') systemVoiceFallback(voiceBridge());
      else if (state === 'empty' || state === 'error') {
        if (voice.timer) {clearTimeout(voice.timer); voice.timer = null;}
        setVoiceStatus(String(data?.message || '没有听清，可以再说一次或直接输入。'));
        voice.retry = true; voiceButton(true);
      }
      return true;
    } catch {return false;}
  };
  window.__qinghengVoiceInput = payload => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const inserted = insertVoiceText(data?.target, data?.text);
      if (!inserted) return false;
      closeVoiceSheet();
      return true;
    } catch {return false;}
  };
  // One delegated handler covers the static mic buttons and anything built later.
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-voice-target]');
    if (!button || button.disabled) return;
    openVoiceSheet(button.dataset.voiceTarget);
  });
  function setupCollapsibleSections() {
    const specs = [
      {anchor:'#settings-form', collapsed:true},
      {anchor:'#push-history', collapsed:true},
      {anchor:'#export-data', collapsed:true}
    ];
    specs.forEach((spec, index) => {
      const anchor = $(spec.anchor), card = anchor?.closest('.card');
      if (!card || card.dataset.collapsibleReady === 'true') return;
      let heading = card.querySelector(':scope > .card-heading');
      if (!heading) {
        const title = card.querySelector(':scope > h2');
        if (!title) return;
        heading = document.createElement('div');
        heading.className = 'card-heading collapse-heading-row';
        card.insertBefore(heading, title);
        heading.appendChild(title);
      }
      const body = document.createElement('div');
      body.className = 'collapsible-body';
      body.id = `collapsible-body-${index}`;
      while (heading.nextSibling) body.appendChild(heading.nextSibling);
      card.appendChild(body);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'collapse-toggle';
      button.dataset.collapseTarget = body.id;
      const label = heading.querySelector('h2,h3')?.textContent.trim() || '这部分';
      const storageKey = `qingheng.collapse.${body.id}`;
      let collapsed = spec.collapsed;
      try {const saved = localStorage.getItem(storageKey); if (saved === '1' || saved === '0') collapsed = saved === '1';} catch {}
      button.setAttribute('aria-expanded', String(!collapsed));
      button.title = collapsed ? `展开${label}` : `收起${label}`;
      button.setAttribute('aria-label', button.title);
      button.innerHTML = `<span class="collapse-icon" aria-hidden="true">${collapsed ? '▾' : '▴'}</span>`;
      heading.appendChild(button);
      body.hidden = collapsed;
      button.addEventListener('click', () => {
        body.hidden = !body.hidden;
        const expanded = !body.hidden;
        button.setAttribute('aria-expanded', String(expanded));
        button.title = expanded ? `收起${label}` : `展开${label}`;
        button.setAttribute('aria-label', button.title);
        button.querySelector('.collapse-icon').textContent = expanded ? '▴' : '▾';
        try {localStorage.setItem(storageKey, body.hidden ? '1' : '0');} catch {}
      });
      card.dataset.collapsibleReady = 'true';
    });
  }
  /**
   * Intake 口径 (defaults mirror D:\AI\health\rules.md and are editable in the profile form).
   * Every number the app hands back is derived from these, so the app and the written rules can
   * never drift apart silently.
   */
