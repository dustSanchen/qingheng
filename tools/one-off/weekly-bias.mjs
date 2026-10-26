import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

patch('app/src/fragments/60-training-copy.fragment.js', [
  ['aggregate energy check',
   "    const average = key => rows.length ? Math.round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length) : 0;",
   `    // Per-meal tolerance (12% / 30 kcal) hides a systematic bias: 25 meals each 15 kcal high is
    // 375 kcal a week but never trips the per-meal rule. Compare the weekly totals as well.
    const totalStated = rows.reduce((sum, row) => sum + row.statedKcal, 0);
    const totalMacro = rows.reduce((sum, row) => sum + row.macroKcal, 0);
    const totalGap = totalStated - totalMacro;
    const gapPercent = totalMacro > 0 ? Math.round(totalGap / totalMacro * 1000) / 10 : 0;
    const biased = totalMacro > 0 && Math.abs(totalGap) > Math.max(80, totalMacro * 0.05);
    const average = key => rows.length ? Math.round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length) : 0;`],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  ['return the weekly comparison',
   "    return {rows, meals, mismatched, worstGap: Math.round(worstGap), days: rows.length,",
   "    return {rows, meals, mismatched, worstGap: Math.round(worstGap), days: rows.length,\n      totalStated, totalMacro, totalGap: Math.round(totalGap), gapPercent, biased,"],
]);

patch('app/src/fragments/70-rest.fragment.js', [
  ['show the weekly bias',
   "      auditLines.push('日均 蛋白 ' + audit.avg.protein",
   `      if (audit.biased) {
        auditLines.push('7 天合计热量 ' + audit.totalStated + ' · 宏量推算 ' + audit.totalMacro + '（差 ' + (audit.totalGap > 0 ? '+' : '') + audit.totalGap + ' kcal，' + (audit.gapPercent > 0 ? '+' : '') + audit.gapPercent + '%）→ 热量被系统性' + (audit.totalGap > 0 ? '高估' : '低估') + '，以宏量为准');
      } else {
        auditLines.push('7 天合计热量与宏量推算相差 ' + (audit.totalGap > 0 ? '+' : '') + audit.totalGap + ' kcal，在容差内');
      }
      auditLines.push('日均 蛋白 ' + audit.avg.protein`],
]);
console.log('weekly bias check wired');
