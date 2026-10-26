import fs from 'node:fs';

// 1) 隐藏清单扩展 + 关闭时把「训练」段拨回「饮食/体重」
const f = 'app/src/fragments/10-rich-answer.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const from = "for (const id of ['training-log', 'training-advice', 'training-volume-card']) {";
const to = "for (const id of ['training-log', 'training-advice', 'training-volume-card', 'week-plan-card', 'training-advice-order']) {";
if (t.includes(from)) { t = t.replace(from, to); console.log('hide list extended'); }
else console.log('hide list already extended');

// 在函数末尾补：关闭训练时把记录页/趋势页的「训练」段切走
const tail = '// Habit tiles filter themselves in renderAll(); there is nothing to re-apply here. }';
if (t.includes(tail)) {
  const replacement = [
    '// Habit tiles filter themselves in renderAll(); there is nothing to re-apply here.',
    '    if (!on) {',
    '      const activeRecord = document.querySelector("[data-records-panel].active");',
    '      if (activeRecord && activeRecord.dataset.recordsPanel === "training") {',
    '        const food = document.querySelector("[data-records-panel=\\"food\\"]");',
    '        if (food) food.click();',
    '      }',
    '      const activeTrend = document.querySelector("[data-trends-panel].active");',
    '      if (activeTrend && activeTrend.dataset.trendsPanel === "training") {',
    '        const weight = document.querySelector("[data-trends-panel=\\"weight\\"]");',
    '        if (weight) weight.click();',
    '      }',
    '      const planPrefs = document.getElementById("plan-prefs");',
    '      if (planPrefs) planPrefs.hidden = true;',
    '    }',
    '  }'
  ].join('\n');
  t = t.replace(tail, replacement);
  console.log('fallback switching added');
}
fs.writeFileSync(f, t);
