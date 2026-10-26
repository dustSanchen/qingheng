/**
 * 前端：每条餐食可展开「逐项明细」，显示每项食物的热量（按热量从高到低）。
 * 记录里没有 items 的老数据不显示入口，避免出现空面板。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/50-onboarding.fragment.js', [
  [
    'an expandable per-item breakdown under each meal row',
    `        + \`<div class="row-meta">\${clock ? \`<span>\${clock}</span>\` : ''}\``,
    `        + \`\${Array.isArray(meal.items) && meal.items.length ? \`<div class="meal-items-wrap"><button type="button" class="meal-items-toggle" data-meal-items="\${esc(meal.id ?? '')}" aria-expanded="false">共 \${meal.items.length} 项 · 查看每项热量</button><div class="meal-items" hidden>\${[...meal.items].sort((a, b) => (number(b.calories) ?? 0) - (number(a.calories) ?? 0)).map(item => \`<div class="meal-item"><span>\${esc(item.name || '未命名')}\${number(item.grams) !== null ? \` · \${fmt(item.grams, 0)} g\` : ''}</span><b>\${fmt(number(item.calories) ?? 0, 0)} kcal</b></div>\`).join('')}</div></div>\` : ''}\`
        + \`<div class="row-meta">\${clock ? \`<span>\${clock}</span>\` : ''}\``,
  ],
]);

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'toggle the breakdown',
    `$('#training-presets')?.addEventListener('click', event => {`,
    `document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-meal-items]');
    if (!toggle) return;
    const panel = toggle.parentElement?.querySelector('.meal-items');
    if (!panel) return;
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $('#training-presets')?.addEventListener('click', event => {`,
  ],
]);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.meal-items-toggle{')) {
  css += `
/* Per-food breakdown: every meal can show which food supplied the calories. */
.meal-items-wrap{margin:6px 0 2px}
.meal-items-toggle{padding:4px 10px;border:1px dashed var(--line);border-radius:10px;background:transparent;color:var(--muted);font-size:12px}
.meal-items-toggle[aria-expanded="true"]{color:var(--ink);border-style:solid}
.meal-items{margin-top:6px;padding:6px 10px;border-radius:10px;background:#f6f8f3}
.meal-items[hidden]{display:none}
.meal-item{display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:12.5px;color:var(--muted)}
.meal-item b{color:var(--ink);font-variant-numeric:tabular-nums}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  meal item styles');
} else console.log('skip meal item styles');

console.log('meal item breakdown wired');
