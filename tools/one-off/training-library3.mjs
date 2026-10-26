/**
 * 剩余两处：建议动作标记 + 计划卡「为什么这样排」。
 * 用双引号锚点，避免反引号/`${}` 转义问题；插入而不是整段替换。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'label suggested movements',
    "<span>${esc(item.name)}</span><b>",
    "<span>${esc(item.name)}${day.suggested ? ' <small class=\"plan-suggest\">建议</small>' : ''}</span><b>",
  ],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'derive the extra blocks before rendering',
    "    box.innerHTML = '<p class=\"plan-today\">",
    `    const suggestedNote = plan.days.some(day => day.suggested) ? '<p class="fine-print">带「建议」的动作来自训练库（该模板你还没有记录），先按 3 组建立基线。</p>' : '';
    const why = Array.isArray(plan.reasons) && plan.reasons.length
      ? '<details class="plan-why"><summary>为什么这样排</summary>' + plan.reasons.map(reason =>
        '<p>' + esc(reason.text) + (reason.source ? '<small> · ' + esc(reason.source) + '</small>' : '') + '</p>').join('') + '</details>'
      : '';
    box.innerHTML = '<p class="plan-today">`,
  ],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'append the explanation under the note',
    "      + '<p class=\"fine-print\">' + esc(plan.note) + '</p>'",
    "      + '<p class=\"fine-print\">' + esc(plan.note) + '</p>' + suggestedNote + why",
  ],
]);

console.log('card edits applied');
