/**
 * ① 修复「记录今天的小习惯」点了不跳转：目标输入框现在在折叠的 <details> 里，
 *    focus() 落在隐藏元素上等于没反应。改为：先展开它所在的折叠块，滚动到可见，再聚焦。
 *    同一个 helper 也覆盖「食品库 / 手动记录」的跳转。
 * ② 小习惯图标：把 ↗ ♧ ☾ ◇ 这些字符符号换成与全站一致的 SVG 图标。
 */
import {patch} from '../lib/patch.mjs';
import fs from 'node:fs';

// ---------------------------------------------------------------- 图标资源 ------------------------------
const icons = {
  'icon-habit-training.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b6b52" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6M20 9v6M7 12h10M7 8v8M17 8v8"/></svg>`,
  'icon-habit-steps.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b6b52" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20c-1.7 0-2.5-1.3-2.5-3.2 0-2.2 1-3.6 2.2-4.6.9-.8 1.6-1.6 1.8-3 .1-.9.6-1.4 1.3-1.4 1 0 1.5.8 1.3 2.1-.2 1.5-.8 2.4-.8 3.4 0 .9.5 1.4 1.4 1.9 1.2.7 1.8 1.6 1.8 2.9 0 1.6-1 2.9-2.9 2.9"/><path d="M4.8 17.2h4.6"/></svg>`,
  'icon-habit-sleep.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b6b52" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8.2 8.2 0 1 0 10.5 10.5z"/></svg>`,
  'icon-habit-water.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b6b52" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5s5.5 5.6 5.5 9.4A5.5 5.5 0 0 1 12 18.4a5.5 5.5 0 0 1-5.5-5.5C6.5 9.1 12 3.5 12 3.5z"/><path d="M9.6 13.2c0 1.6 1.1 2.6 2.4 2.6"/></svg>`,
};
for (const [name, body] of Object.entries(icons)) {
  const target = `app/src/main/assets/${name}`;
  if (!fs.existsSync(target)) fs.writeFileSync(target, body + '\n');
}

// ---------------------------------------------------------------- 跳转修复 ------------------------------
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
  [
    'habit tiles use real icons',
    `    $('#habit-summary').innerHTML = [['↗',training,'训练'],['♧',number(habit.steps)===null?'未记录':\`\${fmt(habit.steps,0)} 步\`,'日常活动'],['☾',number(habit.sleep)===null?'未记录':\`\${fmt(habit.sleep)} 小时\`,'睡眠'],['◇',number(habit.water)===null?'未记录':\`\${fmt(habit.water,0)} ml\`,'饮水']].map(([symbol,value,label]) => \`<div class="habit-tile"><span class="habit-symbol" aria-hidden="true">\${symbol}</span><div><strong>\${esc(value)}</strong><small>\${label}</small></div></div>\`).join('');`,
    `    // Icons instead of ↗ ♧ ☾ ◇: the character set rendered differently on every ROM.
    const tiles = [
      ['icon-habit-training.svg', training, '训练'],
      ['icon-habit-steps.svg', number(habit.steps) === null ? '未记录' : \`\${fmt(habit.steps,0)} 步\`, '日常活动'],
      ['icon-habit-sleep.svg', number(habit.sleep) === null ? '未记录' : \`\${fmt(habit.sleep)} 小时\`, '睡眠'],
      ['icon-habit-water.svg', number(habit.water) === null ? '未记录' : \`\${fmt(habit.water,0)} ml\`, '饮水']
    ];
    $('#habit-summary').innerHTML = tiles.map(([icon, value, label]) => \`<div class="habit-tile"><span class="habit-symbol" aria-hidden="true"><img src="./\${icon}" alt="" width="22" height="22"></span><div><strong>\${esc(value)}</strong><small>\${label}</small></div></div>\`).join('');`,
  ],
]);

console.log('habit jump + icons wired');
