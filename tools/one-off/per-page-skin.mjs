/**
 * 第 10 轮（后半）：按页面自动切换皮肤。
 *   趋势（trends）→ ledger（数据优先）
 *   其余页面        → 用户选定的基础皮肤（默认 paper）
 * 用户也可以选「固定」，两套皮肤任一走到哪都是它。
 */
import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

// 1) 皮肤选择器加第三个按钮「自动」
patch('app/src/main/assets/index.html', [
  ['auto skin option',
   '<button type="button" data-skin-pick="ledger" aria-pressed="false">账本<small>近白底 · 无衬线 · 数据优先</small></button>',
   '<button type="button" data-skin-pick="ledger" aria-pressed="false">账本<small>近白底 · 无衬线 · 数据优先</small></button><button type="button" data-skin-pick="auto" aria-pressed="false">自动<small>趋势用账本，其余用纸感</small></button>'],
  ['skin hint text',
   '两套皮肤共用同一套结构与语义色，只换画布、墨色、标题字体与节奏。切换即时生效，重开仍是上次选择。',
   '两套皮肤共用同一套结构与语义色，只换画布、墨色、标题字体与节奏。「自动」会在趋势页切到账本、其他页保持纸感。'],
]);

// 2) 皮肤逻辑：支持 auto
patch('app/src/fragments/70-rest.fragment.js', [
  ['skin logic supports auto',
   `  const SKINS = ['paper', 'ledger'];`,
   `  const SKINS = ['paper', 'ledger', 'auto'];
  const DATA_PAGES = ['trends'];
  /** 自动模式下：趋势页用 ledger，其余用 paper。 */
  function skinForPage(base, tab) {
    if (base !== 'auto') return SKINS.includes(base) ? base : 'paper';
    return DATA_PAGES.includes(tab) ? 'ledger' : 'paper';
  }`],
  ['applySkin resolves auto',
   `  function applySkin(name, persist = true) {
    const skin = SKINS.includes(name) ? name : 'paper';
    document.documentElement.dataset.skin = skin;`,
   `  function applySkin(name, persist = true) {
    const choice = SKINS.includes(name) ? name : 'paper';
    const skin = skinForPage(choice, document.documentElement.dataset.tab || 'today');
    document.documentElement.dataset.skin = skin;
    document.documentElement.dataset.skinChoice = choice;`],
  ['picker label includes auto',
   "    const tag = $('#skin-tag'); if (tag) tag.textContent = skin;",
   "    const tag = $('#skin-tag'); if (tag) tag.textContent = choice === 'auto' ? '自动 · ' + skin : skin;"],
  ['picker toast label',
   "      button.addEventListener('click', () => { applySkin(button.dataset.skinPick); notice('外观已切换为「' + (button.dataset.skinPick === 'paper' ? '纸感' : '账本') + '」。'); });",
   "      button.addEventListener('click', () => { applySkin(button.dataset.skinPick); notice('外观已切换为「' + ({paper: '纸感', ledger: '账本', auto: '自动'}[button.dataset.skinPick] || '纸感') + '」。'); });"],
]);

// 3) 切页时重算皮肤
patch('app/src/fragments/00-head.fragment.js', [
  ['tab switch reapplies the skin',
   "function switchTab(tab) {",
   "function switchTab(tab) {\n  document.documentElement.dataset.tab = tab;\n  if (typeof applySkin === 'function') applySkin(document.documentElement.dataset.skinChoice || 'paper', false);"],
]);

console.log('per-page skin wired');
