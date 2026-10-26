/**
 * P1-7 记录页瘦身：把低频卡片（日常习惯、食品库、手动记录）收进默认折叠的区域。
 * 运行时包装而不是改大段 HTML，这样卡片内部的渲染逻辑完全不动。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'card collapse installer',
    `  /** One-tap habit values: the form asks for six fields, most days only three matter. */`,
    `  /**
   * 记录页有九张卡片，低频的几张占了半屏。把它们收进默认折叠的 details，卡片内部的渲染逻辑不动。
   */
  function installCardCollapse() {
    const groups = [
      ['#habit-form', '日常习惯（步数 · 睡眠 · 饮水，可选）'],
      ['#food-search', '食品热量参考库（本地，不消耗 token）'],
      ['#manual-meal-form', '手动记录餐食（已知营养数据）']
    ];
    for (const [selector, label] of groups) {
      const anchor = document.querySelector(selector);
      const card = anchor && anchor.closest('article.card');
      if (!card || card.dataset.collapsed === '1') continue;
      const details = document.createElement('details');
      details.className = 'card-collapse';
      const summary = document.createElement('summary');
      summary.textContent = label;
      const body = document.createElement('div');
      body.className = 'card-collapse-body';
      while (card.firstChild) body.appendChild(card.removeChild(card.firstChild));
      details.appendChild(summary);
      details.appendChild(body);
      card.appendChild(details);
      card.dataset.collapsed = '1';
    }
  }
  /** One-tap habit values: the form asks for six fields, most days only three matter. */`,
  ],
  [
    'wire it at boot',
    `  installTrainingAdvice(); installHabitChips(); installChatChips();`,
    `  installCardCollapse(); installTrainingAdvice(); installHabitChips(); installChatChips();`,
  ],
]);

console.log('P1-7 wired');
