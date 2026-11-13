/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- 左右滑动切换 tab ------------------------------------------------------------------------
  // 一屏一次滑动只换一格，方向和 TAB_ORDER 一致：手指向左 = 下一屏，向右 = 上一屏，到头不回绕。
  // 不跟手：跟手要常驻 transform 与滚动锁，和内置滚动、下拉刷新、输入焦点抢手势；判定放在松手时，
  // 复用 switchTab 已有的 from-left/from-right 滑入，手感一致且不新增一套位移。
  (function installTabSwipe(){
    const SWIPE_X = 56;        // 小于这个位移算点击，不算滑动
    const SWIPE_MS = 600;      // 慢慢拖过去不算一次切换
    const SWIPE_RATIO = 1.6;   // 斜着划以纵向滚动为准
    let start = null;
    const blocked = (target) => !!(target && target.closest && target.closest(
      'input,textarea,select,[contenteditable="true"],.app-dialog,.sheet-panel,.pref-chips,.chips,.segmented,.table-wrap,[data-swipe-ignore]'));
    const currentTab = () => document.querySelector('[data-tab][aria-current="page"]')?.dataset.tab || 'today';
    document.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) { start = null; return; }
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY, at: performance.now(), ignore: blocked(event.target) };
    }, { passive: true });
    document.addEventListener('touchend', (event) => {
      const from = start; start = null;
      if (!from || from.ignore || event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - from.x;
      const dy = touch.clientY - from.y;
      if (performance.now() - from.at > SWIPE_MS) return;
      if (Math.abs(dx) < SWIPE_X) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
      // 「我的」的二层页是叠加态，滑走会把没保存的编辑留在背后，先不切。
      if (document.getElementById('profile-hub')?.hidden) return;
      const index = TAB_ORDER.indexOf(currentTab());
      const next = TAB_ORDER[index + (dx < 0 ? 1 : -1)];
      if (!next) return;
      switchTab(next, true);
    }, { passive: true });
    document.addEventListener('touchcancel', () => { start = null; }, { passive: true });
  })();
