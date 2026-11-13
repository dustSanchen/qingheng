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
  //  - tabular figures, so the ring does not jitter while digits change width.
  (function installCountRoll(){
    const nodes = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    if (!nodes.length) return;
    const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const read = (node) => {
      const text = (node.textContent || '').trim();
      if (!text || text === '—') return null;
      const value = Number(text.replace(/[^\d.\-]/g, ''));
      return Number.isFinite(value) ? value : null;
    };
    const format = (value) => Math.round(value).toLocaleString('zh-CN');
    nodes.forEach((node) => {
      let shown = read(node);
      let animating = false;
      const roll = (from, to) => {
        if (reduced()) { node.textContent = format(to); shown = to; return; }
        animating = true;
        const started = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - started) / 320);
          const eased = 1 - Math.pow(1 - t, 3);
          node.textContent = format(from + (to - from) * eased);
          if (t < 1) { requestAnimationFrame(step); return; }
          node.textContent = format(to);
          shown = to;
          animating = false;
        };
        requestAnimationFrame(step);
      };
      new MutationObserver(() => {
        if (animating) return;
        const next = read(node);
        if (next === null) { shown = null; return; }
        if (shown === null) { shown = next; return; }
        if (next === shown) return;
        const from = shown;
        roll(from, next);
      }).observe(node, { childList: true, characterData: true, subtree: true });
    });
  })();
