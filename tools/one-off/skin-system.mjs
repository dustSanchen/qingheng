/**
 * 第 8 轮：把设计语言做成可切换的皮肤。
 *
 * 两套皮肤（只换「结构语言」，不换语义色，避免 188 处硬编码色值失灵）：
 *   paper（现状）  ：暖米纸底 + 衬线标题 + 较松节奏
 *   ledger（新增）：近白画布 + 无衬线标题 + 更紧的圆角与节奏，数据优先
 *
 * 切换方式：我的 → 外观皮肤；持久化在 localStorage，重开仍是上次选择。
 */
import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

// ---------------------------------------------------------------- 1) 皮肤令牌 --------------------------
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('[data-skin="ledger"]')) {
  css += `
/* ── skins ─────────────────────────────────────────────────────────────────────────────
   Every rule below must stay token-only: switching the attribute must not need new CSS.
   paper = warm editorial (serif titles); ledger = crisp data-first (sans titles).      */
[data-skin="ledger"]{
  --paper:#fbfbfa;
  --surface:#ffffff;
  --line:#e3e7e2;
  --ink:#16181a;
  --body-text:#3a3d3c;
  --muted:#6a6d6b;
  --radius-sm:6px;
  --radius-md:10px;
  --radius-lg:14px;
  --measure:36em;
  --font-display:var(--font-ui);
}
[data-skin="ledger"] .card{border-radius:var(--radius-lg)}
[data-skin="ledger"] .card h2{letter-spacing:0}
[data-skin="ledger"] .page-title,[data-skin="ledger"] .hero-title,[data-skin="ledger"] h1{letter-spacing:-.1px;font-weight:600}
[data-skin="ledger"] .segment-bar,[data-skin="ledger"] .records-tabs{background:#f4f6f4}

/* 皮肤切换控件：两枚按钮，选中态用强调色描边 */
.skin-pick{display:flex;gap:var(--space-2);padding:0 var(--space-4) var(--space-3)}
.skin-pick button{flex:1;padding:10px 12px;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface);color:var(--body-text);font-size:var(--text-sm)}
.skin-pick button[aria-pressed="true"]{border-color:var(--accent);color:var(--ink);box-shadow:inset 0 0 0 1px var(--accent)}
.skin-pick small{display:block;margin-top:2px;color:var(--muted);font-size:var(--text-xs)}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  skin tokens');
}

// ---------------------------------------------------------------- 2) 我的页入口 ------------------------
patch('app/src/main/assets/index.html', [
  ['skin card on the hub',
   '<button type="button" class="hub-row" role="listitem" data-subpage-open="about">',
   `<div class="card" id="skin-card"><div class="card-heading"><h2>外观皮肤</h2><span class="tag" id="skin-tag">paper</span></div><p class="fine-print">两套皮肤共用同一套结构与语义色，只换画布、墨色、标题字体与节奏。切换即时生效，重开仍是上次选择。</p><div class="skin-pick" role="group" aria-label="选择外观皮肤"><button type="button" data-skin-pick="paper" aria-pressed="true">纸感<small>暖米底 · 衬线标题</small></button><button type="button" data-skin-pick="ledger" aria-pressed="false">账本<small>近白底 · 无衬线 · 数据优先</small></button></div></div><button type="button" class="hub-row" role="listitem" data-subpage-open="about">`],
]);

// ---------------------------------------------------------------- 3) 皮肤逻辑 --------------------------
patch('app/src/fragments/70-rest.fragment.js', [
  ['skin switching logic',
   "  async function loadStorageStatus(remirror = false) {",
   `  /** 皮肤：attribute + localStorage；不写进 state，避免一次换肤触发整份数据同步。 */
  const SKINS = ['paper', 'ledger'];
  const SKIN_KEY = 'qingheng.skin';
  function currentSkin() {
    try { const saved = localStorage.getItem(SKIN_KEY); return SKINS.includes(saved) ? saved : 'paper'; }
    catch (error) { return 'paper'; }
  }
  function applySkin(name, persist = true) {
    const skin = SKINS.includes(name) ? name : 'paper';
    document.documentElement.dataset.skin = skin;
    if (persist) { try { localStorage.setItem(SKIN_KEY, skin); } catch (error) {} }
    const tag = $('#skin-tag'); if (tag) tag.textContent = skin;
    for (const button of $$('[data-skin-pick]')) button.setAttribute('aria-pressed', String(button.dataset.skinPick === skin));
    return skin;
  }
  function installSkinPicker() {
    applySkin(currentSkin(), false);
    for (const button of $$('[data-skin-pick]')) {
      button.addEventListener('click', () => { applySkin(button.dataset.skinPick); notice('外观已切换为「' + (button.dataset.skinPick === 'paper' ? '纸感' : '账本') + '」。'); });
    }
  }

  async function loadStorageStatus(remirror = false) {`],
]);

// 启动时安装（挂在既有的启动流程里）
patch('app/src/fragments/70-rest.fragment.js', [
  ['install skin picker on boot',
   "  installVersion();",
   "  installSkinPicker();\n  installVersion();"],
]);

console.log('skin system wired');
