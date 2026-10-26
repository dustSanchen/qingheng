/**
 * 实测维持热量校准 + 训练频率杠杆:
 *  - calibratedTdee(): 用已有饮食与体重记录反推真实维持热量（不是公式估）；
 *  - 薄肌计划里加一条「把训练提到 4 次/周会怎样」，因为提高维持热量是不动口径就能加速的唯一杠杆。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/40-targets.fragment.js', [
  [
    'four-session lever in the lean plan',
    `      lines.push(
        \`薄肌（线条）路径：`,
    `      // Raising maintenance is the only lever that speeds this up without touching the 口径.
      const altFactor = activityFactorFor(4);
      const altTdee = Math.round(bmr * altFactor);
      const altTarget = Math.round(altTdee * (1 - Math.min(preset.deficitPercent, cap) / 100));
      lines.push(
        \`训练频率杠杆：3 次/周 → 维持 \${tdee}；提到 4 次/周（系数 \${altFactor}）→ 维持约 \${altTdee}，12% 缺口目标约 \${altTarget} kcal\` +
        (altTarget >= floor ? \`，仍在硬底线 \${floor} 之上，不必下调口径\` : \`，会跌破硬底线 \${floor}，需要另议\`)
      );
      lines.push(
        \`薄肌（线条）路径：`,
  ],
  [
    'calibration function',
    `  /** Writes computed targets back into the profile form and reports the basis. */`,
    `  /**
   * Real maintenance calories from the user's own log: mean intake minus the energy implied by the
   * weight change over the same window. This is the only maintenance number that is not an estimate.
   *
   * Deliberately works on dates that actually have records (no "today minus N days" arithmetic), so a
   * timezone or a gap in logging cannot silently shift the window.
   */
  function calibratedTdee(maxDays = 21) {
    const meals = Array.isArray(state.meals) ? state.meals : [];
    const byDay = new Map();
    for (const meal of meals) {
      const date = String(meal.date || '');
      if (!validDate(date)) continue;
      const kcal = number(meal.calories);
      if (kcal === null) continue;
      byDay.set(date, (byDay.get(date) || 0) + kcal);
    }
    const intakeDays = [...byDay.keys()].sort().slice(-maxDays);
    if (intakeDays.length < 14) {
      return {ok: false, reason: \`有热量的记录只有 \${intakeDays.length} 天，至少需要 14 天\`};
    }
    const from = intakeDays[0], to = intakeDays[intakeDays.length - 1];
    const points = (Array.isArray(state.measurements) ? state.measurements : [])
      .filter(row => validDate(String(row.date)) && number(row.weight) !== null && String(row.date) >= from && String(row.date) <= to)
      .map(row => ({date: String(row.date), weight: number(row.weight)}))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (points.length < 2) {
      return {ok: false, reason: \`窗口内只有 \${points.length} 次体重记录，至少需要 2 次\`};
    }
    const spanDays = Math.max(1, Math.round((Date.parse(points[points.length - 1].date) - Date.parse(points[0].date)) / 86400000));
    const deltaKg = points[points.length - 1].weight - points[0].weight;
    const meanIntake = [...byDay.entries()].filter(([date]) => date >= from && date <= to).reduce((sum, [, kcal]) => sum + kcal, 0) / intakeDays.length;
    const tdee = Math.round(meanIntake - deltaKg * 7700 / spanDays);
    return {
      ok: true,
      tdee,
      meanIntake: Math.round(meanIntake),
      deltaKg: Math.round(deltaKg * 10) / 10,
      spanDays,
      days: intakeDays.length,
      from, to
    };
  }
  /** Writes computed targets back into the profile form and reports the basis. */`,
  ],
  [
    'show the calibrated number',
    `    status.className = 'target-status';
    status.textContent = ['已按「' + (GOAL_LABEL[result.goal] || '增肌同时减脂') + '」与你的口径测算：']
      .concat(result.lines)
      .concat(result.warnings.map(text => '⚠ ' + text))
      .concat(['这是起点而非结论，用 2~4 周真实记录校准更可靠。'])
      .join('\\n');`,
    `    // The formula TDEE is a starting point; the log-derived one is what the plan should trust.
    const calibration = calibratedTdee();
    const calibrationLine = calibration.ok
      ? \`实测维持热量：约 \${calibration.tdee} kcal（\${calibration.days} 天记录，平均摄入 \${calibration.meanIntake}，\${calibration.spanDays} 天体重变化 \${calibration.deltaKg} kg）\`
        + (Math.abs(calibration.tdee - result.tdee) >= 120 ? \`；与公式值 \${result.tdee} 相差 \${calibration.tdee - result.tdee > 0 ? '+' : ''}\${calibration.tdee - result.tdee} kcal，以实测为准\` : '；与公式值一致')
      : \`还测不出实测维持热量：\${calibration.reason}（记录满 2~3 周再回来看）\`;
    status.className = 'target-status';
    status.textContent = ['已按「' + (GOAL_LABEL[result.goal] || '增肌同时减脂') + '」与你的口径测算：']
      .concat(result.lines)
      .concat([calibrationLine])
      .concat(result.warnings.map(text => '⚠ ' + text))
      .concat(['这是起点而非结论，用 2~4 周真实记录校准更可靠。'])
      .join('\\n');`,
  ],
]);

console.log('calibration + frequency lever wired');
