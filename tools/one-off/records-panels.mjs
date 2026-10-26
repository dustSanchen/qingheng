/**
 * 记录页分段化：把一张很长的卡片列拆成「饮食 / 训练 / 身体」三段，
 * 这是 MyFitnessPal、薄荷健康、Keep 一类应用的主流做法——每段都短，主操作在段首。
 *
 * 采用运行时重排（按卡片标题移动 DOM），不改动 10KB 的 HTML 结构，避免大段替换出错。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'segmented panels for the records page',
    `  installProfileAutoRecalc();`,
    `  installRecordPanels();
  installProfileAutoRecalc();`,
  ],
  [
    'the panel installer',
    `  /**
   * Jumps to a form field that may live inside a collapsed card: open the details, scroll it into view,
   * then focus. Without the open() step the tap looks like nothing happened.
   */`,
    `  /**
   * The records page had eight cards in one column — a very long scroll where the primary action
   * (log a meal) competed with rarely-used utilities. It is now split into three segments, ordered so
   * the common action comes first in each. Layout matches what fitness apps converged on: a segmented
   * bar on top, one short screen per intent.
   */
  const RECORD_PANELS = [
    {key: 'food', label: '饮食', headings: ['轻松记一餐', '复制一餐', '最近的餐食记录', '食品热量参考库', '手动记录餐食']},
    {key: 'training', label: '训练', headings: ['训练日志'], trainingOnly: true},
    {key: 'body', label: '身体', headings: ['身体数据', '日常习惯']}
  ];
  const RECORD_PANEL_STORAGE = 'qingheng.recordsPanel';
  function installRecordPanels() {
    const view = $('#view-records');
    if (!view || $('#records-tabs')) return;
    const cards = [...view.querySelectorAll('article.card')];
    const cardFor = heading => cards.find(card => $('h2', card)?.textContent.trim() === heading);
    const host = $('.record-grid', view) || view;
    const bar = document.createElement('div');
    bar.className = 'segment-bar';
    bar.id = 'records-tabs';
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', '记录分类');
    bar.innerHTML = RECORD_PANELS.map(panel =>
      \`<button type="button" class="segment" role="tab" data-records-panel="\${panel.key}">\${panel.label}</button>\`).join('');
    host.parentNode.insertBefore(bar, host);
    const panels = {};
    for (const panel of RECORD_PANELS) {
      const container = document.createElement('div');
      container.className = 'record-panel';
      container.id = 'record-panel-' + panel.key;
      container.dataset.panel = panel.key;
      for (const heading of panel.headings) {
        const card = cardFor(heading);
        if (card) container.append(card);
      }
      host.append(container);
      panels[panel.key] = container;
    }
    // Nothing left in the original grid: keep the element for its layout, it is now just a wrapper.
    const saved = (() => {try {return localStorage.getItem(RECORD_PANEL_STORAGE);} catch {return null;}})();
    switchRecordPanel(RECORD_PANELS.some(p => p.key === saved) ? saved : 'food');
    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-records-panel]');
      if (button) switchRecordPanel(button.dataset.recordsPanel);
    });
  }
  /** Shows one segment; remembers the choice, and hides 训练 entirely for a no-training profile. */
  function switchRecordPanel(key) {
    const target = RECORD_PANELS.some(panel => panel.key === key) ? key : 'food';
    for (const panel of RECORD_PANELS) {
      const node = $('#record-panel-' + panel.key);
      if (node) node.hidden = panel.key !== target || (panel.trainingOnly && !trainingEnabled());
    }
    for (const button of $$('[data-records-panel]')) {
      const active = button.dataset.recordsPanel === target;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.classList.toggle('active', active);
      if (button.dataset.recordsPanel === 'training') button.hidden = !trainingEnabled();
    }
    try {localStorage.setItem(RECORD_PANEL_STORAGE, target);} catch {}
    window.scrollTo({top: 0, behavior: 'auto'});
    return target;
  }
  /** Which segment owns a field, so a jump from 今天 can open the right one first. */
  function recordPanelForField(id) {
    if (!id) return null;
    if (['habit-steps', 'measurement-weight', 'habit-form'].includes(id)) return 'body';
    if (['training-form', 'training-exercises'].includes(id)) return 'training';
    return 'food';
  }
  /**
   * Jumps to a form field that may live inside a collapsed card: open the details, scroll it into view,
   * then focus. Without the open() step the tap looks like nothing happened.
   */`,
  ],
  [
    'jumps switch to the right segment first',
    `  function revealField(id) {
    const field = id ? document.getElementById(id) : null;
    if (!field) return;`,
    `  function revealField(id) {
    const field = id ? document.getElementById(id) : null;
    if (!field) return;
    switchRecordPanel(recordPanelForField(id));`,
  ],
]);

// ---------------------------------------------------------------- 样式 --------------------------------
import fs from 'node:fs';
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.segment-bar{')) {
  css += `
/* Segmented control on the records page: one short screen per intent instead of one long column. */
.segment-bar{position:sticky;top:calc(-4px + env(safe-area-inset-top));z-index:8;display:flex;gap:6px;margin:0 0 14px;padding:6px;border:1px solid var(--line);border-radius:16px;background:var(--paper);box-shadow:0 4px 14px #3146310a}
.segment{flex:1 1 0;padding:9px 10px;border:0;border-radius:12px;background:transparent;color:var(--muted);font-size:14px;font-weight:600}
.segment[aria-selected="true"]{background:var(--sage-soft, #e8f0e9);color:var(--ink)}
.segment[hidden]{display:none}
.record-panel{display:flex;flex-direction:column;gap:14px}
.record-panel[hidden]{display:none}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  segment styles');
} else console.log('skip segment styles');

console.log('records panels wired');
