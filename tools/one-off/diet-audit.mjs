import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

// 1) 纯函数：饮食体检
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['diet audit helper',
   '  /** The local library, if present. Everything here degrades gracefully without it. */',
   `  /** Every meal: does its stated kcal match its own macros? And the daily averages. */
  function dietAudit(days) {
    const rows = [];
    let meals = 0, mismatched = 0, worstGap = 0;
    for (const day of days || []) {
      const list = (state.meals || []).filter(row => row && row.date === day);
      if (!list.length) continue;
      let stated = 0, derived = 0;
      for (const meal of list) {
        meals++;
        const p = number(meal.protein) ?? 0, c = number(meal.carbs) ?? 0, f = number(meal.fat) ?? 0;
        const kcal = number(meal.calories) ?? 0;
        const fromMacros = p * 4 + c * 4 + f * 9;
        stated += kcal; derived += fromMacros;
        const gap = Math.abs(kcal - fromMacros);
        if (gap > Math.max(30, fromMacros * 0.12)) { mismatched++; worstGap = Math.max(worstGap, gap); }
      }
      const totals = totalsFor(list);
      rows.push({date: day, meals: list.length, kcal: Math.round(totals.calories), protein: Math.round(totals.protein),
        fat: Math.round(totals.fat), carbs: Math.round(totals.carbs), statedKcal: Math.round(stated), macroKcal: Math.round(derived)});
    }
    const average = key => rows.length ? Math.round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length) : 0;
    return {rows, meals, mismatched, worstGap: Math.round(worstGap), days: rows.length,
      avg: {kcal: average('kcal'), protein: average('protein'), fat: average('fat'), carbs: average('carbs')}};
  }

  /** The library, if present. Everything here degrades gracefully without it. */`],
]);

// 2) 饮食趋势卡里显示体检结果
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
console.log('diet audit wired');
