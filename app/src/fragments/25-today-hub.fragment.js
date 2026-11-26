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
