/**
 * 「越接近目标越绿」的连续配色，并把它应用到三处：
 *  1. 饮食趋势：摄入离当天目标越远，颜色越偏琥珀/红；
 *  2. 训练容量变化：容量增长越接近渐进超负荷的自然幅度越绿，掉量偏白/红；
 *  3. 体重首末变化：与计划周变化率（由缺口推算）越接近越绿。
 */
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- 调色助手 ----------------------------
patch('app/src/fragments/00-head.fragment.js', [
  [
    'a continuous goal colour',
    `  /** True when the user told us they do not train, so training UI should not be shown at all. */`,
    `  /**
   * Continuous "how close to the target" colour: ratio 0 = on target (green), 1 = far off (red),
   * passing through amber. Used instead of hard good/bad buckets so a near miss still looks near.
   */
  function goalColor(ratio) {
    const t = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 1));
    const hue = t < 0.5 ? 142 - (142 - 42) * (t / 0.5) : 42 - (42 - 6) * ((t - 0.5) / 0.5);
    const saturation = 34 + 30 * t;
    const lightness = 42 + 5 * t;
    return \`hsl(\${Math.round(hue)} \${Math.round(saturation)}% \${Math.round(lightness)}%)\`;
  }
  /** True when the user told us they do not train, so training UI should not be shown at all. */`,
  ],
]);

// ---------------------------------------------------------------- 计划周变化率 --------------------------
patch('app/src/fragments/40-targets.fragment.js', [
  [
    'the plan states its expected weekly change',
    `weeklyAverage, weeklyAverageDeficit, leanPlan, warnings, provisional: trainingUnset, trainingOff, lines };`,
    `weeklyAverage, weeklyAverageDeficit,
      // 1 kg of fat is ~7700 kcal, so the weekly gap converts to an expected rate the trend can grade against.
      expectedWeeklyKg: Math.round(((tdee - weeklyAverage) * 7 / 7700) * 100) / 100,
      leanPlan, warnings, provisional: trainingUnset, trainingOff, lines };`,
  ],
]);

patch('app/src/fragments/00-head.fragment.js', [
  [
    'the range carries the expected rate through',
    `    return {
      min: useTraining ? trainingDay.min : restDay.min,
      max: useTraining ? trainingDay.max : restDay.max,
      trained,
      basis,
      trainingDay,
      restDay,
      floor: rules.intakeFloor
    };`,
    `    return {
      min: useTraining ? trainingDay.min : restDay.min,
      max: useTraining ? trainingDay.max : restDay.max,
      trained,
      basis,
      trainingDay,
      restDay,
      floor: rules.intakeFloor,
      expectedWeeklyKg: active && Number.isFinite(active.expectedWeeklyKg) ? active.expectedWeeklyKg : null
    };`,
  ],
]);

// ---------------------------------------------------------------- 饮食趋势 ----------------------------
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'diet bars grade by distance from the target',
    `      const stateKey = !recorded ? 'empty' : kcal > range.max ? 'over' : kcal < range.min ? 'low' : 'in';`,
    `      const stateKey = !recorded ? 'empty' : kcal > range.max ? 'over' : kcal < range.min ? 'low' : 'in';
      // 0 = dead centre of the range, 0.4 = at an edge, 1 = far outside. Colours move green -> amber -> red.
      const mid = (range.min + range.max) / 2, half = Math.max(1, (range.max - range.min) / 2);
      const ratio = kcal > range.max
        ? Math.min(1, 0.4 + 0.6 * ((kcal - range.max) / Math.max(range.max, 1)))
        : kcal < range.min
          ? Math.min(1, 0.4 + 0.6 * ((range.min - kcal) / Math.max(range.min, 1)))
          : 0.4 * (Math.abs(kcal - mid) / half);
      const barColor = recorded ? goalColor(ratio) : 'transparent';`,
  ],
  [
    'the bar uses that colour',
    `<i class="\${stateKey}" style="width:\${percent}%"></i>`,
    `<i class="\${stateKey}" style="width:\${percent}%;background:\${barColor}"></i>`,
  ],
  [
    'the weight delta grades against the planned rate',
    `const delta = Number(last.weight)-Number(first.weight);`,
    `const delta = Number(last.weight)-Number(first.weight);
    // Observed rate per week vs the rate the current plan implies; closer is greener.
    const spanDays = Math.max(1, Math.round((dayTime(last.date) - dayTime(first.date)) / 86400000));
    const plannedRate = intakeRangeForDate(last.date).expectedWeeklyKg;
    const observedRate = spanDays >= 7 ? (delta / spanDays) * 7 : null;
    const rateRatio = plannedRate === null || observedRate === null || plannedRate === 0
      ? null
      : Math.min(1, Math.abs(observedRate - plannedRate) / Math.max(0.2, Math.abs(plannedRate) * 1.5));
    const rateColor = rateRatio === null ? '' : \` style="color:\${goalColor(rateRatio)}"\`;`,
  ],
]);

// ---------------------------------------------------------------- 训练容量 ----------------------------
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'volume deltas grade instead of two buckets',
    `<td><span class="stats-trend stats-\${row.delta >= 0 ? 'good' : 'warn'}">\${row.delta >= 0 ? '+' : ''}\${fmt(row.delta, 0)} <small>kg</small></span></td>`,
    `<td><span class="stats-trend" style="color:\${goalColor(row.delta >= 0 ? Math.max(0, 0.35 - Math.min(0.35, (row.prevVolume > 0 ? row.delta / row.prevVolume : 0) * 2.2)) : Math.min(1, 0.35 + Math.abs(row.prevVolume > 0 ? row.delta / row.prevVolume : 0) * 3))}">\${row.delta >= 0 ? '+' : ''}\${fmt(row.delta, 0)} <small>kg</small></span></td>`,
  ],
]);

console.log('graded colours wired');
