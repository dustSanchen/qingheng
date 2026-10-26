/**
 * 布局优化四项：
 *  1. 今天页顶部快捷胶囊（记一餐 / 记训练 / 记体重 / 拍照）
 *  2. 趋势页三段（体重 / 饮食 / 训练），并新增一块饮食趋势
 *  3. 最近的餐食记录：默认 5 条 + 「显示全部 N 条」
 *  4. 历史按天分组（标题带当天合计），参考薄荷的「按天卡片」
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- 1. 今天页快捷胶囊 --------------------
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'quick actions on today',
    `  installRecordPanels();`,
    `  installTodayQuickActions();
  installRecordPanels();
  installTrendPanels();`,
  ],
  [
    'the quick action row and its handlers',
    `  /**
   * The records page had eight cards in one column`,
    `  /**
   * Four chips at the top of today: the actions people actually take every day, one tap away instead of
   * a scroll hunt. Each chip routes to the right segment and focuses the field.
   */
  function installTodayQuickActions() {
    const view = $('#view-today');
    if (!view || $('#today-quick-actions')) return;
    const heading = $('.page-heading', view);
    if (!heading) return;
    const row = document.createElement('div');
    row.className = 'quick-actions';
    row.id = 'today-quick-actions';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', '今日快捷操作');
    row.innerHTML = [
      ['＋ 记一餐', 'meal-text'],
      ['🏋 记训练', 'training-form'],
      ['⚖ 记体重', 'measurement-weight'],
      ['📷 拍照', 'photo']
    ].map(([label, focus]) => \`<button type="button" class="quick-chip" data-quick-focus="\${focus}">\${label}</button>\`).join('');
    heading.after(row);
    row.addEventListener('click', event => {
      const chip = event.target.closest('[data-quick-focus]');
      if (!chip) return;
      const focus = chip.dataset.quickFocus;
      switchTab('records', true);
      switchRecordPanel(recordPanelForField(focus === 'photo' ? 'meal-text' : focus));
      setTimeout(() => {
        if (focus === 'photo') {
          // The camera tile is a label bound to the file input; clicking it opens the camera.
          $('#view-records label[for="meal-image"]')?.click();
          return;
        }
        if (focus === 'training-form') {
          const form = $('#training-form');
          if (form) $('[data-training-preset]', form)?.focus();
          return;
        }
        revealField(focus);
      }, 80);
    });
  }
  /**
   * Trends also grew into one long column. Same segmented treatment, plus a diet card that the page
   * never had (it only showed weight, volume and body composition).
   */
  function installTrendPanels() {
    const view = $('#view-trends');
    if (!view || $('#trends-tabs')) return;
    const cards = [...view.querySelectorAll('article.card')];
    const cardFor = heading => cards.find(card => $('h2', card)?.textContent.trim() === heading);
    const host = $('.record-grid', view) || view;
    const panels = [
      {key: 'weight', label: '体重', headings: ['体重变化', '身体成分对照', '身体记录明细']},
      {key: 'diet', label: '饮食', headings: [], extra: true},
      {key: 'training', label: '训练', headings: ['训练容量（渐进超负荷）']}
    ];
    const bar = document.createElement('div');
    bar.className = 'segment-bar';
    bar.id = 'trends-tabs';
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', '趋势分类');
    bar.innerHTML = panels.map(panel => \`<button type="button" class="segment" role="tab" data-trends-panel="\${panel.key}">\${panel.label}</button>\`).join('');
    host.parentNode.insertBefore(bar, host);
    for (const panel of panels) {
      const container = document.createElement('div');
      container.className = 'record-panel';
      container.id = 'trend-panel-' + panel.key;
      container.dataset.panel = panel.key;
      for (const heading of panel.headings) {
        const card = cardFor(heading);
        if (card) container.append(card);
      }
      if (panel.extra) container.append(dietTrendCard());
      host.append(container);
    }
    switchTrendPanel('weight');
    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-trends-panel]');
      if (button) switchTrendPanel(button.dataset.trendsPanel);
    });
  }
  function switchTrendPanel(key) {
    for (const panel of ['weight', 'diet', 'training']) {
      const node = $('#trend-panel-' + panel);
      if (node) node.hidden = panel !== key;
    }
    for (const button of $$('[data-trends-panel]')) {
      const active = button.dataset.trendsPanel === key;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.classList.toggle('active', active);
      if (button.dataset.trendsPanel === 'training') button.hidden = !trainingEnabled();
    }
    if ($('#trend-panel-training')?.hidden !== false) { /* no-op, keeps the guard explicit */ }
  }
  /** The diet trend the page was missing: last 7 days of intake against that day's range. */
  function dietTrendCard() {
    const card = document.createElement('article');
    card.className = 'card';
    card.id = 'diet-trend-card';
    const days = [];
    for (let offset = 6; offset >= 0; offset--) days.push(shiftDate(activeDate, -offset));
    const rows = days.map(day => {
      const meals = (state.meals || []).filter(row => row.date === day);
      const totals = totalsFor(meals);
      const range = intakeRangeForDate(day);
      const span = range.max - range.min || 1;
      const position = Math.max(0, Math.min(100, Math.round((((totals.calories ?? 0) - range.min) / span) * 100)));
      const over = (totals.calories ?? 0) > range.max;
      return \`<div class="diet-day"><span class="diet-day-label">\${day.slice(5)}</span><span class="diet-bar" role="img" aria-label="\${Math.round(totals.calories ?? 0)} kcal，目标 \${range.min}~\${range.max}"><i style="width:\${position}%" class="\${over ? 'over' : ''}"></i></span><span class="diet-day-value">\${meals.length ? Math.round(totals.calories ?? 0) : '—'}</span></div>\`;
    }).join('');
    const logged = days.filter(day => (state.meals || []).some(row => row.date === day)).length;
    card.innerHTML = \`<div class="card-heading"><h2>饮食趋势</h2><span class="tag">近 7 天 · 有记录 \${logged}/7</span></div><p class="muted">每根条相对当天的目标区间；超出上限会标红。</p><div class="diet-bars">\${rows}</div>\`;
    return card;
  }
  /**
   * The records page had eight cards in one column`,
  ],
]);

// ---------------------------------------------------------------- 3/4. 餐食列表 ------------------------
patch('app/src/fragments/50-onboarding.fragment.js', [
  [
    'split the row builder out so it can be reused',
    `  function renderMeals(container, meals, showDate) {
    container.innerHTML = meals.length ? meals.map(meal => {`,
    `  /** Row markup for one meal; split out so day-grouped lists can reuse it. */
  function mealRowsHtml(meals, showDate) {
    return meals.map(meal => {`,
  ],
  [
    'renderMeals uses the builder',
    `    }).join('') : empty('还没有餐食记录。记下第一餐，从了解自己开始。');
  }`,
    `    }).join('');
  }
  function renderMeals(container, meals, showDate) {
    container.innerHTML = meals.length ? mealRowsHtml(meals, showDate) : empty('还没有餐食记录。记下第一餐，从了解自己开始。');
  }
  /**
   * The record list is grouped by day (the way 薄荷健康 shows 按天卡片) and capped at five meals until
   * the user asks for everything. Both keep the page short without hiding data.
   */
  const RECORD_MEALS_COLLAPSED = 5;
  let recordMealsExpanded = false;
  function renderRecordMeals(rows) {
    const container = $('#record-meals');
    if (!container) return;
    if (!rows.length) { container.innerHTML = empty('还没有餐食记录。记下第一餐，从了解自己开始。'); return; }
    const shown = recordMealsExpanded ? rows : rows.slice(0, RECORD_MEALS_COLLAPSED);
    const groups = new Map();
    for (const row of shown) {
      const day = String(row.date || '');
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(row);
    }
    const html = [...groups].map(([day, list]) => {
      const kcal = Math.round(totalsFor(list).calories ?? 0);
      return \`<div class="meal-day"><div class="meal-day-head"><strong>\${esc(dayLabel(day))}</strong><span>\${list.length} 餐 · \${fmt(kcal, 0)} kcal</span></div>\${mealRowsHtml(list, false)}</div>\`;
    }).join('');
    const toggle = rows.length > RECORD_MEALS_COLLAPSED
      ? \`<button type="button" class="button subtle" id="record-meals-toggle">\${recordMealsExpanded ? '收起' : \`显示全部 \${rows.length} 条\`}</button>\`
      : '';
    container.innerHTML = html + toggle;
    $('#record-meals-toggle')?.addEventListener('click', () => {recordMealsExpanded = !recordMealsExpanded; renderRecordMeals(rows);});
  }
  /** 10-18 for this year, 2025-10-18 otherwise. */
  function dayLabel(day) {
    if (!validDate(day)) return '未标日期';
    const today = localDate();
    const sameYear = day.slice(0, 4) === today.slice(0, 4);
    return sameYear ? day.slice(5) : day;
  }`,
  ],
]);

patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'the record list goes through the grouped renderer',
    `    renderMeals($('#record-meals'),(favoriteOnlyMeals?recordMeals.filter(row => row.favorite === true):recordMeals).slice(0,30),true);`,
    `    renderRecordMeals(favoriteOnlyMeals ? recordMeals.filter(row => row.favorite === true) : recordMeals);`,
  ],
]);

// ---------------------------------------------------------------- 样式 --------------------------------
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.quick-actions{')) {
  css += `
/* Today's four everyday actions, one tap away. */
.quick-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 14px}
.quick-chip{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 4px;border:1px solid var(--line);border-radius:14px;background:var(--paper);color:var(--ink);font-size:13px;font-weight:600;line-height:1.2}
.quick-chip:active{background:var(--sage-soft, #e8f0e9)}
/* Day groups in the record list: a heading with that day's total, then its meals. */
.meal-day{margin-bottom:12px}
.meal-day-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:4px 2px 6px;color:var(--muted);font-size:12.5px}
.meal-day-head strong{color:var(--ink);font-size:13.5px}
/* Diet trend bars: one row per day, width relative to that day's target range. */
.diet-bars{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.diet-day{display:flex;align-items:center;gap:10px;font-size:12.5px}
.diet-day-label{flex:0 0 42px;color:var(--muted);font-variant-numeric:tabular-nums}
.diet-bar{position:relative;flex:1 1 auto;height:10px;border-radius:999px;background:#eef1ea;overflow:hidden}
.diet-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--sage, #6f8f74)}
.diet-bar i.over{background:#c9776f}
.diet-day-value{flex:0 0 56px;text-align:right;font-variant-numeric:tabular-nums}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  layout styles');
} else console.log('skip layout styles');

console.log('four layout optimisations wired');
