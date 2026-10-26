/**
 * 修 饮食趋势：卡片在启动时（state 还是空壳）被渲染了一次就静态了，
 * 所以永远显示「有记录 0/7」。改为外壳建一次、内容每次 render 时重画。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'the diet card becomes a shell that is filled later',
    `  /** The diet trend the page was missing: last 7 days of intake against that day's range. */
  function dietTrendCard() {
    const card = document.createElement('article');
    card.className = 'card';
    card.id = 'diet-trend-card';
    const days = [];`,
    `  /** The diet trend the page was missing: last 7 days of intake against that day's range. */
  function dietTrendCard() {
    const card = document.createElement('article');
    card.className = 'card';
    card.id = 'diet-trend-card';
    card.innerHTML = '<div class="card-heading"><h2>饮食趋势</h2><span class="tag">近 7 天</span></div><p class="muted">每根条相对当天的目标区间；超出上限会标红。</p><div class="diet-bars"></div>';
    return card;
  }
  /**
   * Fills the card from whatever state is current. It used to be rendered once at boot, while state was
   * still an empty skeleton, so it always claimed "0/7 days" no matter how much was recorded.
   */
  function renderDietTrend() {
    const card = $('#diet-trend-card');
    if (!card) return;
    const days = [];`,
  ],
  [
    'and the fill body writes into the card',
    `    const logged = days.filter(day => (state.meals || []).some(row => row.date === day)).length;
    card.innerHTML = \`<div class="card-heading"><h2>饮食趋势</h2><span class="tag">近 7 天 · 有记录 \${logged}/7</span></div><p class="muted">每根条相对当天的目标区间；超出上限会标红。</p><div class="diet-bars">\${rows}</div>\`;
    return card;
  }`,
    `    const logged = days.filter(day => (state.meals || []).some(row => row.date === day)).length;
    card.innerHTML = \`<div class="card-heading"><h2>饮食趋势</h2><span class="tag">近 7 天 · 有记录 \${logged}/7</span></div><p class="muted">每根条相对当天的目标区间；超出上限会标红。</p><div class="diet-bars">\${rows}</div>\`;
  }`,
  ],
]);

patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'refresh the diet card with every render',
    `    renderTrainingInsights();
    applyTrainingVisibility();`,
    `    renderTrainingInsights();
    if (typeof renderDietTrend === 'function') renderDietTrend();
    applyTrainingVisibility();`,
  ],
]);

console.log('diet trend refresh wired');
