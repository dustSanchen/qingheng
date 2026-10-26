/**
 * 1) 今天页餐食行：删除按钮从「热量下方」挪到「标题行最右」，并缩小到 32px，
 *    这样热量数字与删除不再叠在一起误触，行高也更紧凑；
 * 2) 档案页：改「饮食目标」或「每周训练次数」后自动按薄肌/减脂/增肌同时减脂重算，
 *    并明确提示「未保存」。
 */
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- 行布局 ------------------------------
patch('app/src/fragments/50-onboarding.fragment.js', [
  [
    'delete button moves into the title row',
    `        + \`\${showDate ? \`<span class="row-date">\${esc(meal.date)}</span>\` : ''}</div>\``,
    `        + \`\${showDate ? \`<span class="row-date">\${esc(meal.date)}</span>\` : ''}\`
        + \`\${meal.id !== undefined ? \`<button type="button" class="icon-button danger row-delete" data-delete-meal="\${esc(meal.id)}" aria-label="删除\${esc(meal.name || '餐食')}" title="删除这条餐食"><span class="inline-icon" aria-hidden="true"><img src="./icon-trash.svg" alt="" width="16" height="16"></span></button>\` : ''}</div>\``,
  ],
  [
    'the side column keeps only the calories',
    `        + \`<div class="row-side"><span class="row-kcal">\${fmt(meal.calories,0)} <small>kcal</small></span>\`
        + \`\${meal.id !== undefined ? \`<button type="button" class="icon-button danger" data-delete-meal="\${esc(meal.id)}" aria-label="删除\${esc(meal.name || '餐食')}" title="删除这条餐食"><span class="inline-icon" aria-hidden="true"><img src="./icon-trash.svg" alt="" width="19" height="19"></span></button>\` : ''}</div></div>\`;`,
    `        + \`<div class="row-side"><span class="row-kcal">\${fmt(meal.calories,0)} <small>kcal</small></span></div></div>\`;`,
  ],
]);

// ---------------------------------------------------------------- 自动重算 ----------------------------
patch('app/src/fragments/40-targets.fragment.js', [
  [
    'mark the recalculation as unsaved',
    `    status.className = 'target-status';
    status.textContent = ['已按「' + (GOAL_LABEL[result.goal] || '增肌同时减脂') + '」与你的口径测算：']`,
    `    status.className = 'target-status';
    status.textContent = [(options.auto ? '已按当前选择自动重算（未保存）：' : '已按「' + (GOAL_LABEL[result.goal] || '增肌同时减脂') + '」与你的口径测算：')]`,
  ],
  [
    'auto recalc on goal or training change',
    `  async function persistProfile(extra) {`,
    `  /**
   * Changing weekly training frequency (or the goal) changes TDEE, so every target derived from it —
   * calorie ranges, protein, fat, carbs, weekly average — is recalculated immediately. Nothing is
   * saved until 保存档案, and the status line says so.
   */
  function installProfileAutoRecalc() {
    const form = $('#profile-form');
    if (!form) return;
    const fields = ['goal', 'training', 'weight', 'height', 'age'];
    form.addEventListener('change', event => {
      const name = event.target && event.target.name;
      if (!fields.includes(name)) return;
      recalcProfileTargets({saveMeasurement: false, auto: true}).catch(() => {});
    });
  }
  async function persistProfile(extra) {`,
  ],
  [
    'auto recalc needs its own flag',
    `    // The formula TDEE is a starting point; the log-derived one is what the plan should trust.`,
    `    if (options.auto) status.dataset.auto = '1'; else delete status.dataset.auto;
    // The formula TDEE is a starting point; the log-derived one is what the plan should trust.`,
  ],
]);

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'install the auto recalc',
    `  installCardCollapse(); installTrainingAdvice(); installHabitChips(); installChatChips();`,
    `  installProfileAutoRecalc();
  installCardCollapse(); installTrainingAdvice(); installHabitChips(); installChatChips();`,
  ],
]);

// ---------------------------------------------------------------- 样式 --------------------------------
import fs from 'node:fs';
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.row-delete{')) {
  css += `
/* The delete action sits at the end of the title row: away from the calorie number, and small enough
   that the row keeps its height. */
.row-delete{width:32px;height:32px;min-width:32px;min-height:32px;border-radius:10px;margin-left:auto}
.row-delete .inline-icon img{width:16px;height:16px}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  row delete styles');
} else console.log('skip row delete styles');

console.log('layout + auto recalc wired');
