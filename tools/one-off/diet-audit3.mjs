import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/70-rest.fragment.js', [
  ['render the diet audit',
   "    card.innerHTML = `<div class=\"card-heading\"><h2>饮食趋势</h2>",
   `    const audit = dietAudit(days);
    const profileForAudit = effectiveProfileForDate(activeDate);
    const proteinTarget = number(profileForAudit.proteinMin);
    const fatTarget = number(profileForAudit.fatMax);
    const auditLines = [];
    if (audit.days) {
      auditLines.push('记录 ' + audit.days + '/7 天 · ' + audit.meals + ' 餐');
      auditLines.push(audit.mismatched
        ? audit.mismatched + ' 餐的热量与三大营养素对不上（最大差 ' + audit.worstGap + ' kcal），已按 4/4/9 校正'
        : '所有餐次的热量与 4/4/9 推算一致');
      auditLines.push('日均 蛋白 ' + audit.avg.protein + (proteinTarget ? ' / 目标 ' + proteinTarget : '') + ' g · 脂肪 ' + audit.avg.fat + (fatTarget ? ' / 上限 ' + Math.round(fatTarget) : '') + ' g · 碳水 ' + audit.avg.carbs + ' g');
    } else {
      auditLines.push('这 7 天还没有记录，先记一餐再看检查结果');
    }
    card.innerHTML = \`<div class="diet-audit">\${auditLines.map(line => '<p>' + esc(line) + '</p>').join('')}</div>\` + \`<div class="card-heading"><h2>饮食趋势</h2>`],
]);
console.log('audit rendered');
