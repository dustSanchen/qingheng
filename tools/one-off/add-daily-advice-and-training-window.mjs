/**
 * Round improvements:
 *  1. 每日推送与建议 opens on *today's* advice instead of an empty query form;
 *  2. 今天页 gets a dedicated 今日训练建议 window (own consent, three presets, answer inline);
 *  3. 日常习惯 loses its friction: one-tap chips for steps/sleep/water plus 复制昨天;
 *  4. 问答 gets suggestion chips (what the common AI health apps do to avoid a blank box).
 * Native side: /api/chat accepts focus=training so that window answers training only.
 */
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- HTML ------------------------------
patch('app/src/main/assets/index.html', [
  [
    'training advice card after the energy card',
    /id="macro-summary"><\/div>[\s\S]{0,400}?<\/article>/,
    (() => '')() || `id="macro-summary"></div><p class="fine-print">记录热量不等于实际全部摄入；未记录的餐食不计入汇总。</p></article>
      <article class="card" id="training-advice"><div class="card-heading"><h2>今日训练建议</h2><span class="tag">问一句</span></div><p class="muted">结合今天的训练记录与你的目标，直接问练什么、强度怎么定。</p><div class="button-row" id="training-advice-chips"></div><form id="training-advice-form"><label>你的问题<textarea id="training-advice-input" rows="2" maxlength="600" placeholder="例如：今天只有 40 分钟，练推还是拉？"></textarea></label><div class="check-label"><input type="checkbox" id="training-advice-consent"><span>同意把这个问题与今天的训练数据发送给已配置的外部模型。</span></div><button class="button primary full-width" type="submit">问训练建议</button><p class="form-feedback" id="training-advice-feedback" role="status" aria-live="polite"></p></form><div id="training-advice-answer" class="answer" hidden></div></article>`,
  ],
  [
    'chat suggestion chips',
    `</details><label>你的问题<textarea id="chat-question"`,
    `</details><div class="button-row" id="chat-chips" aria-label="常用问题"></div><label>你的问题<textarea id="chat-question"`,
  ],
  [
    'push: today card first, history stays below',
    '<article class="card"><div class="card-heading"><h2>每日推送生活建议</h2><button class="text-button" type="button" id="refresh-push-history">查询 ↻</button></div><div id="push-history" class="muted">查询每天早晚推送中保存的生活建议。</div>',
    '<article class="card" id="push-today-card"><div class="card-heading"><h2>今天的建议</h2><span class="tag" id="push-today-tag">当天</span></div><div id="push-today" class="list-stack" role="list"><p class="muted">正在读取今天的建议…</p></div><p class="fine-print">这里只显示今天的建议；未开启推送或当天还没生成时为空。</p></article><article class="card"><div class="card-heading"><h2>历史建议</h2><button class="text-button" type="button" id="refresh-push-history">查询 ↻</button></div><div id="push-history" class="muted">按日期范围回看已保存的建议。</div>',
  ],
  [
    'habit quick chips',
    `<label>饮水 · ml<input name="water" type="number" step="50" min="0" max="20000" placeholder="可选"></label></div><button class="button primary" type="submit">保存日常习惯</button>`,
    `<label>饮水 · ml<input name="water" type="number" step="50" min="0" max="20000" placeholder="可选"></label></div><div class="button-row" id="habit-chips" aria-label="快速填入"></div><button class="button primary" type="submit">保存日常习惯</button>`,
  ],
]);

// ---------------------------------------------------------------- JS --------------------------------
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'today advice loader + training window + chips',
    `  const runPushHistory = (useRange, button) => {`,
    `  /**
   * Today's advice, grouped by slot. The page used to open on an empty query form, which read as
   * "there is no advice" even when this morning's push had already written one.
   */
  async function loadTodayAdvice() {
    const box = $('#push-today'); if (!box) return;
    const tag = $('#push-today-tag');
    const today = localDate();
    if (tag) tag.textContent = today;
    try {
      const data = await api('/api/push-history');
      const order = {morning: 0, meal: 1, evening: 2, weekly: 3};
      const slotNames = {morning: '白天建议', meal: '餐后反馈', evening: '晚间复盘', weekly: '每周复盘'};
      const rows = (Array.isArray(data && data.records) ? data.records : [])
        .filter(row => row && String(row.date) === today)
        .sort((a, b) => (order[a.slot] ?? 9) - (order[b.slot] ?? 9) || Number(a.createdAt || 0) - Number(b.createdAt || 0));
      box.innerHTML = rows.length
        ? rows.map(row => \`<div class="meal-row list-row" role="listitem"><div class="row-body"><div class="row-head"><strong>\${esc(slotNames[row.slot] || row.slot || '建议')}</strong><span class="row-tag">\${row.source === 'api' ? '外部模型' : row.source === 'skipped' ? '已跳过' : '提醒'}</span><span class="row-date">\${esc(String(row.date || ''))}</span></div><div class="answer">\${answerHtml(row.message || '')}</div></div></div>\`).join('')
        : empty('今天还没有生成建议。开启每日推送后，07:30 与 20:30 的分析会出现在这里；也可以直接在问答页问一句。');
    } catch (error) {
      box.textContent = error.message;
    }
  }
  /** The 今天-page window: training questions only, with its own consent gate. */
  function installTrainingAdvice() {
    const form = $('#training-advice-form'), input = $('#training-advice-input'), consent = $('#training-advice-consent');
    const answerBox = $('#training-advice-answer'), feedbackBox = $('#training-advice-feedback'), chips = $('#training-advice-chips');
    if (!form || !input) return;
    const presets = ['今天练什么最划算？', '只有 40 分钟，怎么排？', '昨晚没睡好，今天强度怎么调？'];
    if (chips) chips.innerHTML = presets.map((text, index) => \`<button type="button" class="button subtle" data-training-preset="\${index}">\${esc(text)}</button>\`).join('');
    if (chips) chips.addEventListener('click', event => {
      const button = event.target.closest('[data-training-preset]');
      if (!button) return;
      input.value = presets[Number(button.dataset.trainingPreset)] || '';
      input.focus();
    });
    if (consent) {try {consent.checked = localStorage.getItem('qingheng.training.consent') === '1';} catch {}}
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question) {feedback(feedbackBox, '先写一句要问的训练问题。', true); return;}
      if (consent && !consent.checked) {feedback(feedbackBox, '请先勾选同意，训练建议需要发送给外部模型。', true); return;}
      feedback(feedbackBox, '正在生成…');
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        const data = await api('/api/chat', {question, focus: 'training', date: localDate(), allowExternal: true, anchors: anchorSummary(), webSearch: false});
        const reply = String(data && data.reply || '').trim();
        if (!reply) throw new Error('模型没有返回可读的回答，请重试。');
        if (answerBox) {answerBox.hidden = false; answerBox.innerHTML = answerHtml(reply);}
        feedback(feedbackBox, '');
      } catch (error) {
        feedback(feedbackBox, error.message, true);
      } finally {
        if (button) button.disabled = false;
      }
    });
  }
  /** One-tap habit values: the form asks for six fields, most days only three matter. */
  function installHabitChips() {
    const row = $('#habit-chips'), form = $('#habit-form');
    if (!row || !form) return;
    const presets = [
      ['步数 6k', 'steps', 6000], ['步数 8k', 'steps', 8000], ['步数 10k', 'steps', 10000],
      ['睡眠 6.5h', 'sleep', 6.5], ['睡眠 7.5h', 'sleep', 7.5], ['睡眠 8.5h', 'sleep', 8.5],
      ['饮水 1.5L', 'water', 1500], ['饮水 2L', 'water', 2000], ['饮水 2.5L', 'water', 2500]
    ];
    row.innerHTML = presets.map(([label, key, value], index) => \`<button type="button" class="button subtle" data-habit-preset="\${index}">\${esc(label)}</button>\`).join('')
      + '<button type="button" class="button subtle" data-habit-copy="1">复制昨天</button>';
    row.addEventListener('click', event => {
      const copy = event.target.closest('[data-habit-copy]');
      if (copy) {
        const yesterday = shiftDay(localDate(), -1);
        const rowData = (state.habits || []).find(item => item && item.date === yesterday);
        if (!rowData) {notice('昨天没有习惯记录可复制。', true); return;}
        for (const key of ['steps', 'sleep', 'water']) {
          const field = form.elements[key];
          if (field && number(rowData[key]) !== null) field.value = rowData[key];
        }
        notice('已填入昨天的数值，可修改后保存。');
        return;
      }
      const button = event.target.closest('[data-habit-preset]');
      if (!button) return;
      const [label, key, value] = presets[Number(button.dataset.habitPreset)];
      const field = form.elements[key];
      if (field) {field.value = value; field.focus();}
    });
  }
  /** Suggested questions: an empty box is the main reason people do not ask anything. */
  function installChatChips() {
    const row = $('#chat-chips'), box = $('#chat-question');
    if (!row || !box) return;
    const presets = ['我今天蛋白够吗？', '今天训练日该怎么吃？', '本周体重趋势怎么样？'];
    row.innerHTML = presets.map((text, index) => \`<button type="button" class="button subtle" data-chat-chip="\${index}">\${esc(text)}</button>\`).join('');
    row.addEventListener('click', event => {
      const button = event.target.closest('[data-chat-chip]');
      if (!button) return;
      box.value = presets[Number(button.dataset.chatChip)] || '';
      box.focus();
    });
  }
  const runPushHistory = (useRange, button) => {`,
  ],
  [
    'wire the new installers and the push default',
    `  setupCollapsibleSections(); installQuickRecordControls(); installHealthConnectControls(); searchFoods(); restoreConsent(); installExactAlarmControl();`,
    `  installTrainingAdvice(); installHabitChips(); installChatChips();
  setupCollapsibleSections(); installQuickRecordControls(); installHealthConnectControls(); searchFoods(); restoreConsent(); installExactAlarmControl();`,
  ],
  [
    'persist the training consent choice',
    `      if (consent && !consent.checked) {feedback(feedbackBox, '请先勾选同意，训练建议需要发送给外部模型。', true); return;}`,
    `      if (consent && !consent.checked) {feedback(feedbackBox, '请先勾选同意，训练建议需要发送给外部模型。', true); return;}
      if (consent) {try {localStorage.setItem('qingheng.training.consent', '1');} catch {}}`,
  ],
]);

patch('app/src/fragments/00-head.fragment.js', [
  [
    'push subpage loads today on open',
    `    if (sub === 'about') {loadStorageStatus(false).catch(() => {}); loadVersions().catch(() => {});}`,
    `    if (sub === 'about') {loadStorageStatus(false).catch(() => {}); loadVersions().catch(() => {});}
    // 每日推送与建议 must open on today's advice, not on an empty query form.
    if (sub === 'push') {loadTodayAdvice().catch(() => {});}`,
  ],
]);

// ---------------------------------------------------------------- native ----------------------------
patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'training focus for the new window',
    `        messages.put(new JSONObject().put("role", "system").put("content", chatDataContext(selectedDate)));`,
    `        messages.put(new JSONObject().put("role", "system").put("content", chatDataContext(selectedDate)));
        // The 今天-page window asks training questions only, so it gets a narrower instruction.
        if ("training".equals(b.optString("focus", ""))) {
            messages.put(new JSONObject().put("role", "system").put("content",
                    "本次只回答训练安排：今天练哪个模板、哪些动作、组次与强度、要不要有氧、时间不够怎么取舍。"
                    + "结合今日训练记录（trainedToday）与目标；不超过 4 句，给一个能立刻执行的安排，数字用区间。"
                    + "不回答饮食与疾病问题，若被问到就一句话说明这是训练窗口并建议去问答页。"));
        }`,
  ],
]);

console.log('today advice + training window + chips wired');
