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
  function installHealthConnectControls() {
    const row = $('#export-data')?.parentElement;
    if (!row || $('#health-connect-sync')) return;
    const sync = document.createElement('button');
    sync.type = 'button'; sync.className = 'button subtle'; sync.id = 'health-connect-sync'; sync.textContent = '同步手表数据';
    const settings = document.createElement('button');
    settings.type = 'button'; settings.className = 'button subtle'; settings.id = 'health-connect-settings'; settings.textContent = 'Health Connect 权限';
    row.prepend(settings); row.prepend(sync);
    settings.addEventListener('click', () => {
      const bridge = window.QinghengNative;
      if (bridge && typeof bridge.openHealthConnectSettings === 'function') bridge.openHealthConnectSettings();
      else notice('Health Connect 权限设置需要已安装的 APK。', true);
    });
    const typeNames = {steps:'步数', sleep:'睡眠', exercise:'运动', activeCalories:'活动热量', distance:'距离'};
    const countText = counts => Object.keys(typeNames)
      .filter(key => counts && Number(counts[key]) > 0)
      .map(key => `${typeNames[key]} ${Number(counts[key])}`).join('、');
    sync.addEventListener('click', async event => {
      const button = event.currentTarget, message = $('#data-feedback');
      button.disabled = true;
      try {
        // Health Connect read permission is a user decision: ask for it here instead of sending the
        // user to a settings screen and leaving the sync button as a dead end.
        const status = await api('/api/health-connect/status');
        if (status?.permissionsGranted !== true) {
          const bridge = window.QinghengNative;
          if (!bridge || typeof bridge.requestHealthConnectPermissions !== 'function') {
            feedback(message, '手表数据读取需要已安装的 APK。', true);
            return;
          }
          feedback(message, '正在请求健康数据读取权限，请在系统弹窗中允许…');
          // The native side decides between the framework request and Health Connect's own screen;
          // without this call the promise below would wait for an answer nobody asked for.
          try {bridge.requestHealthConnectPermissions();}
          catch {feedback(message, '无法发起健康数据授权请求。', true); return;}
          const answer = await waitHealthResult();
          if (answer?.granted !== true) {
            feedback(message, `仍未获得授权：${answer?.message || '需要睡眠、步数、运动、活动热量与距离的读取权限'}。`
              + '如果 Health Connect 的「应用权限」里没有列出轻衡，说明系统没把侧载安装识别为健康数据应用。'
              + '可打开「Health Connect 权限」查看列表，或改用应用商店版本；手表数据仍可在对应 App 里查看。', true);
            return;
          }
        }
        feedback(message, '正在同步手表数据…');
        const result = await api('/api/health-connect/sync', {days:30});
        if (result?.permissionsGranted !== true) {
          feedback(message, `未能读取：${result?.reason || '权限不足'}。`, true);
          return;
        }
        await loadState({quiet:true});
        const total = Number(result.count || 0), detail = countText(result.counts);
        if (total === 0) {
          feedback(message, '权限已就绪，但最近 30 天 Health Connect 里没有这五类记录。请确认小米运动健康已开启向 Health Connect 写入（小米运动健康 → 我的 → 设置 → 第三方数据/Health Connect），并戴着手表同步过一次。', true);
          return;
        }
        feedback(message, `已同步 ${total} 条手表记录到手机${detail ? `（${detail}）` : ''}。`);
      } catch (error) {feedback(message, error.message, true);}
      finally {button.disabled = false;}
    });
  }
  /** Resolves with the native answer to the Health Connect permission prompt. */
  function waitHealthResult(timeoutMs = 120000) {
    return new Promise(resolve => {
      let done = false;
      const finish = value => {if (done) return; done = true; window.__qinghengHealthResult = previous; resolve(value);};
      const previous = window.__qinghengHealthResult;
      window.__qinghengHealthResult = payload => {
        try {finish(typeof payload === 'string' ? JSON.parse(payload) : payload);}
        catch {finish(null);}
        return true;
      };
      setTimeout(() => finish(null), timeoutMs);
    });
  }
  function setupCollapsibleSections() {
    const specs = [
      {anchor:'#food-search', collapsed:true},
      {anchor:'#manual-meal-form', collapsed:true},
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
