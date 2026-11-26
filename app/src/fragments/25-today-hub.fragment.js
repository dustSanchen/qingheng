/* Fragment 25-today-hub -- 今天页刷新中枢（事件订阅 + 按帧合并），2026-11-27 Phase 3
 *
 * 以前「保存之后重画今天页」散在 10-rich-answer 的 renderBody 内部调用与 70-rest 的保存路径里：
 * 连记两笔就是两次整页重绘，数字还会闪。这里只做一件事——订阅领域事件，把同一帧内的多次变更
 * 合并成一次刷新，并按区域选择重画范围。
 *
 * 口径：能量环 / 体检 / 行动条的读数只由 renderBody 生产（同一份 totalsFor/effectiveProfileForDate），
 * 这里不复制第二套算法；时间线可以单独重画。
 */
  const TODAY_REFRESH_SECTIONS = ['energy', 'timeline', 'check', 'action'];
  const TODAY_REFRESH_ALL = TODAY_REFRESH_SECTIONS.slice();
  let todayRefreshFrame = 0;
  let todayRefreshPending = new Set();

  /** 只重画「今日记录」时间线：数据源与 renderBody 里那段完全一致。 */
  function refreshTodayTimeline() {
    if (typeof renderTodayTimeline !== 'function' || !state) return;
    const meals = (state.meals || []).filter(row => row && row.date === activeDate);
    renderTodayTimeline($('#today-meals'), meals);
    const count = $('#today-record-count');
    if (count) count.textContent = meals.length ? `${meals.length} 餐` : '暂无';
  }

  /**
   * 按区域刷新。能量环、今日体检、行动条共用 renderBody 的同一条口径——
   * 分开重画会各算一遍 totalsFor，数字对不上时更难查，所以这三段仍然走整页渲染。
   */
  function runTodayRefresh(section) {
    if (section === 'timeline') { refreshTodayTimeline(); return; }
    if (typeof renderBody === 'function') renderBody();
  }

  /**
   * 把同一帧里的多次保存合并成一次刷新。
   * @param {string|string[]} sections 需要刷新的区域，超出白名单的值忽略。
   */
  function scheduleTodayRefresh(sections) {
    const list = Array.isArray(sections) ? sections : [sections];
    for (const section of list) {
      if (TODAY_REFRESH_SECTIONS.includes(section)) todayRefreshPending.add(section);
    }
    if (!todayRefreshPending.size || todayRefreshFrame) return;
    const flush = () => {
      todayRefreshFrame = 0;
      const pending = [...todayRefreshPending];
      todayRefreshPending = new Set();
      if (pending.some(section => section !== 'timeline')) { runTodayRefresh('energy'); return; }
      runTodayRefresh('timeline');
    };
    todayRefreshFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(flush) : setTimeout(flush, 16);
  }

  /** 订阅五个领域事件；没有 QH（老产物/单测沙箱）时安静退出。 */
  function installTodayHub() {
    if (!window.QH || !QH.bus || typeof QH.bus.on !== 'function') return;
    const events = QH.EVENTS || {};
    const map = [
      [events.DIET_SAVED, TODAY_REFRESH_ALL],
      [events.TRAINING_SAVED, TODAY_REFRESH_ALL],
      [events.WEIGHT_SAVED, ['check', 'action', 'timeline']],
      [events.HABIT_UPDATED, ['check', 'action']],
      [events.PREFS_CHANGED, ['energy', 'check', 'action']],
    ];
    for (const [event, sections] of map) {
      if (!event) continue;
      try { QH.bus.on(event, () => scheduleTodayRefresh(sections)); } catch { }
    }
  }

  installTodayHub();

  /** Place common actions below the calorie summary, in reach without covering page content. */
  function installTodayQuickActions() {
    const view = $('#view-today');
    if (!view || $('#today-quick-actions')) return;
    const energyCard = $('.energy-card', view);
    if (!energyCard) return;
    const row = document.createElement('div');
    row.className = 'quick-actions';
    row.id = 'today-quick-actions';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', '今日快捷操作');
    row.innerHTML = [
      ['icon-meal.svg', '记一餐', 'meal-text', 'quick-chip-primary'],
      ['icon-glyph-training.svg', '训练', 'training-form', ''],
      ['icon-glyph-balance.svg', '身体', 'measurement-weight', '']
    ].filter(([, , focus]) => focus !== 'training-form' || trainingEnabled()).map(([icon, label, focus, className = '']) => `<button type="button" class="quick-chip ${className}" data-quick-focus="${focus}" data-quick-icon="${icon}"><span class="quick-chip-icon" aria-hidden="true">${iconMarkup(icon)}</span>${label}</button>`).join('');
    // 动作组紧贴能量卡之下：先读数（环 → 宏量三列 → 补蛋白提示），再动作。
    // 不放进卡里——卡内动作条会把一张卡切成两半；也没挂在宏量后面，空态时环与宏量都是 hidden，锚点会消失。
    // 2026-11-22 第五轮：三个核心入口进卡，固定在能量环下方的黄金区；
    // 不再靠 ⋯ 菜单承载主操作，低频的「显示指标」移到小习惯卡标题。
    const anchor = $('.energy-body', energyCard);
    if (anchor && anchor.parentElement === energyCard) anchor.after(row);
    else energyCard.prepend(row);

    row.addEventListener('click', event => {
      const chip = event.target.closest('[data-quick-focus]');
      if (!chip) return;
      openRecordTarget(chip.dataset.quickFocus);
    });
  }

  /**
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
        ? rows.map(row => `<div class="meal-row list-row" role="listitem"><div class="row-body"><div class="row-head"><strong>${esc(slotNames[row.slot] || row.slot || '建议')}</strong><span class="row-tag">${row.source === 'api' ? '外部模型' : row.source === 'skipped' ? '已跳过' : '提醒'}</span><span class="row-date">${esc(String(row.date || ''))}</span></div><div class="answer">${answerHtml(row.message || '')}</div></div></div>`).join('')
        : empty('今天还没有生成建议。开启每日推送后，07:30 与 20:30 的分析会出现在这里；也可以直接在问答页问一句。');
    } catch (error) {
      box.textContent = error.message;
    }
  }
