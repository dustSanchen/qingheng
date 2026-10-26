/**
 * 小习惯图标（在 10-rich-answer 里，不是 70-rest）+ 折叠区跳转修复（在 70-rest）。
 * 两个文件分开打，避免一个锚点失败导致整份文件不写。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'habit tiles use real icons',
    "    $('#habit-summary').innerHTML = [['↗',training,'训练'],['♧',number(habit.steps)===null?'未记录':`${fmt(habit.steps,0)} 步`,'日常活动'],['☾',number(habit.sleep)===null?'未记录':`${fmt(habit.sleep)} 小时`,'睡眠'],['◇',number(habit.water)===null?'未记录':`${fmt(habit.water,0)} ml`,'饮水']].map(([symbol,value,label]) => `<div class=\"habit-tile\"><span class=\"habit-symbol\" aria-hidden=\"true\">${symbol}</span><div><strong>${esc(value)}</strong><small>${label}</small></div></div>`).join('');",
    `    // SVG icons instead of ↗ ♧ ☾ ◇: those characters rendered differently on every ROM.
    const tiles = [
      ['icon-habit-training.svg', training, '训练'],
      ['icon-habit-steps.svg', number(habit.steps) === null ? '未记录' : \`\${fmt(habit.steps,0)} 步\`, '日常活动'],
      ['icon-habit-sleep.svg', number(habit.sleep) === null ? '未记录' : \`\${fmt(habit.sleep)} 小时\`, '睡眠'],
      ['icon-habit-water.svg', number(habit.water) === null ? '未记录' : \`\${fmt(habit.water,0)} ml\`, '饮水']
    ];
    $('#habit-summary').innerHTML = tiles.map(([icon, value, label]) => \`<div class="habit-tile"><span class="habit-symbol" aria-hidden="true"><img src="./\${icon}" alt="" width="22" height="22"></span><div><strong>\${esc(value)}</strong><small>\${label}</small></div></div>\`).join('');`,
  ],
]);

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'open the collapsed group before focusing',
    `  $$('[data-go]').forEach(button=>button.addEventListener('click',()=>{switchTab(button.dataset.go,true);if(button.dataset.focus) document.getElementById(button.dataset.focus)?.focus();}));`,
    `  /**
   * Jumps to a form field that may live inside a collapsed card: open the details, scroll it into view,
   * then focus. Without the open() step the tap looks like nothing happened.
   */
  function revealField(id) {
    const field = id ? document.getElementById(id) : null;
    if (!field) return;
    const details = field.closest('details');
    if (details && !details.open) details.open = true;
    field.scrollIntoView({block: 'center', behavior: 'smooth'});
    field.focus({preventScroll: true});
  }
  $$('[data-go]').forEach(button=>button.addEventListener('click',()=>{switchTab(button.dataset.go,true);if(button.dataset.focus) setTimeout(() => revealField(button.dataset.focus), 60);}));`,
  ],
]);

console.log('habit tiles + reveal wired');
