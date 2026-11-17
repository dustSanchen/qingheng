/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- Motion layer ----------------------------------------------------------------------------
  // Numbers land, they do not perform. A value change eases from the number that was on screen to
  // the new one in 320ms, then stops being a moving number. Everything else in the app already
  // animates through styles.css tokens; this file only covers what CSS cannot: a text node whose
  // value is replaced by render code.
  //
  // Rules worth keeping:
  //  - never roll on first paint (— to 0 is not a transition, it is noise);
  //  - a reduced-motion user gets the final number immediately, never a shortened roll;
  //  - tabular figures, so the ring does not jitter while digits change width;
  //  - a render that lands mid-roll continues from what is on screen, and a watchdog guarantees the
  //    final number even if the vendored runtime misbehaves.
  function installCountRoll(root){
    const scope = root && root.querySelectorAll ? root : document;
    const nodes = Array.prototype.slice.call(scope.querySelectorAll('[data-count]'));
    if (!nodes.length) return;
    const lib = window.MotionLib && typeof window.MotionLib.animate === 'function' ? window.MotionLib : null;
    const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const easings = (t) => 1 - Math.pow(1 - t, 3);
    const read = (node) => {
      const text = (node.textContent || '').trim();
      if (!text || text === '—') return null;
      const value = Number(text.replace(/[^\d.\-]/g, ''));
      return Number.isFinite(value) ? value : null;
    };
    const format = (value) => Math.round(value).toLocaleString('zh-CN');

    nodes.forEach((node) => {
      // 重新调用时只挂新节点：训练概览每次渲染都会换掉自己的数字节点。
      if (node.dataset.countWired === '1') return;
      node.dataset.countWired = '1';
      let shown = read(node);       // 最后一次渲染写入的目标值
      let displayed = shown;        // 屏幕此刻的值（滚动途中会落后于目标）
      let writing = 0;              // 自己写入的次数，用来把外部渲染的写入摘出来
      let controls = null;
      let fallbackFrame = 0;
      let watchdog = 0;

      const paint = (value) => { displayed = value; writing += 1; node.textContent = format(value); };
      const stop = () => {
        if (controls) { try { controls.stop(); } catch (error) { /* 停不掉就等下一次写入覆盖 */ } controls = null; }
        if (fallbackFrame) { cancelAnimationFrame(fallbackFrame); fallbackFrame = 0; }
        if (watchdog) { clearTimeout(watchdog); watchdog = 0; }
      };
      const settle = (target) => { stop(); shown = target; paint(target); };
      const frameLoop = (from, to) => {
        const started = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - started) / 320);
          paint(from + (to - from) * easings(t));
          if (t < 1) { fallbackFrame = requestAnimationFrame(tick); return; }
          fallbackFrame = 0;
          settle(to);
        };
        fallbackFrame = requestAnimationFrame(tick);
      };

      const roll = (from, to) => {
        shown = to;
        if (reduced()) { settle(to); return; }
        stop();
        if (lib) {
          const state = { value: from };
          try {
            controls = lib.animate(state, { value: to }, {
              duration: 0.32,
              easing: easings,
              onUpdate: () => paint(state.value),
            });
            if (controls && typeof controls.then === 'function') {
              controls.then(() => settle(to)).catch(() => settle(to));
            }
            watchdog = setTimeout(() => { if (shown === to && displayed !== to) settle(to); }, 420);
            return;
          } catch (error) {
            controls = null;
          }
        }
        frameLoop(from, to);
      };

      new MutationObserver(() => {
        if (writing > 0) { writing -= 1; return; }
        const next = read(node);
        if (next === null) { stop(); shown = null; displayed = null; return; }
        if (shown === null) { shown = next; displayed = next; return; }
        if (next === shown) return;
        roll(displayed === null ? next : displayed, next);
      }).observe(node, { childList: true, characterData: true, subtree: true });
    });
  }
  installCountRoll(document);

  // ---- Card entrance ---------------------------------------------------------------------------
  // 首帧不表演：切到某个 tab 时才让这个 tab 的卡片按真实顺序依次归位 6px。
  // 之所以交给 motion.min.js 而不是 nth-child 的 CSS：错帧跟着 .card 的实际顺序走，卡片外面再包一层
  // 或中间插一个空态块都不会错位；快速连点 tab 时每次切换都是独立的一次入场，不会叠加。
  (function installViewStagger(){
    const lib = window.MotionLib && typeof window.MotionLib.animate === 'function' ? window.MotionLib : null;
    if (!lib) return;
    const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const entrance = (t) => 1 - Math.pow(1 - t, 3);
    const stagger = (view) => {
      const cards = Array.prototype.slice.call(view.children)
        .filter((child) => child.classList && child.classList.contains('card'))
        .slice(0, 5);
      cards.forEach((card, index) => {
        try {
          lib.animate(card, { opacity: [0, 1], y: [6, 0] }, {
            duration: 0.26,
            delay: index * 0.028,
            easing: entrance,
          });
        } catch (error) {
          // 入场失败就让它静止：不动是可接受的降级，卡在半透明不可接受。
          card.style.opacity = '';
          card.style.transform = '';
        }
      });
    };
    const views = Array.prototype.slice.call(document.querySelectorAll('.view'));
    views.forEach((view) => {
      // 首屏已显示的页面记一笔，之后切回来才做入场。
      if (!view.hidden) view.dataset.motionSeen = '1';
      new MutationObserver(() => {
        if (view.hidden || reduced()) return;
        if (view.dataset.motionSeen !== '1') { view.dataset.motionSeen = '1'; return; }
        stagger(view);
      }).observe(view, { attributes: true, attributeFilter: ['hidden'] });
    });
  })();
