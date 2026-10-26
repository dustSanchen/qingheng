/**
 * 体重首末变化着色：不改动原有 HTML 字符串（含引号，锚点易碎），
 * 改为渲染后给第二个 <strong> 上色。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/50-onboarding.fragment.js', [
  [
    'compute the planned-vs-observed rate',
    `    const delta = Number(last.weight)-Number(first.weight);`,
    `    const delta = Number(last.weight)-Number(first.weight);
    // Observed weekly rate vs the rate the current plan implies; the closer they are, the greener.
    const spanDays = Math.max(1, Math.round((dayTime(last.date) - dayTime(first.date)) / 86400000));
    const plannedRate = intakeRangeForDate(last.date).expectedWeeklyKg;
    const observedRate = spanDays >= 7 ? (delta / spanDays) * 7 : null;
    const rateRatio = plannedRate === null || observedRate === null || plannedRate === 0
      ? null
      : Math.min(1, Math.abs(observedRate - plannedRate) / Math.max(0.2, Math.abs(plannedRate) * 1.5));
    const rateColor = rateRatio === null ? '' : goalColor(rateRatio);`,
  ],
  [
    'colour the delta and explain the plan rate',
    `    renderDailyThree();`,
    `    // The delta is the second <strong> in the stats row; colour it by distance from the planned rate.
    if (rateColor) {
      const stats = $$('#trend-stats strong');
      if (stats[1]) {
        stats[1].style.color = rateColor;
        stats[1].title = \`计划每周 \${plannedRate > 0 ? '+' : ''}\${fmt(plannedRate, 2)} kg，实际每周 \${observedRate > 0 ? '+' : ''}\${fmt(observedRate, 2)} kg\`;
      }
    }
    renderDailyThree();`,
  ],
]);

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'diet bars grade by distance from the target',
    `      const stateKey = !recorded ? 'empty' : kcal > range.max ? 'over' : kcal < range.min ? 'low' : 'in';`,
    `      const stateKey = !recorded ? 'empty' : kcal > range.max ? 'over' : kcal < range.min ? 'low' : 'in';
      // 0 = centre of the range, 0.4 = at an edge, 1 = far outside: green -> amber -> red.
      const mid = (range.min + range.max) / 2, half = Math.max(1, (range.max - range.min) / 2);
      const ratio = kcal > range.max
        ? Math.min(1, 0.4 + 0.6 * ((kcal - range.max) / Math.max(range.max, 1)))
        : kcal < range.min
          ? Math.min(1, 0.4 + 0.6 * ((range.min - kcal) / Math.max(range.min, 1)))
          : 0.4 * (Math.abs(kcal - mid) / half);
      const barColor = recorded ? goalColor(ratio) : 'transparent';`,
  ],
  [
    'the bar uses the graded colour',
    '<i class="${stateKey}" style="width:${percent}%"></i>',
    '<i class="${stateKey}" style="width:${percent}%;background:${barColor}"></i>',
  ],
  [
    'volume deltas grade instead of two buckets',
    '<td><span class="stats-trend stats-${row.delta >= 0 ? \'good\' : \'warn\'}">${row.delta >= 0 ? \'+\' : \'\'}${fmt(row.delta, 0)} <small>kg</small></span></td>',
    '<td><span class="stats-trend" style="color:${goalColor(row.delta >= 0 ? Math.max(0, 0.35 - Math.min(0.35, (row.prevVolume > 0 ? row.delta / row.prevVolume : 0) * 2.2)) : Math.min(1, 0.35 + Math.abs(row.prevVolume > 0 ? row.delta / row.prevVolume : 0) * 3))}">${row.delta >= 0 ? \'+\' : \'\'}${fmt(row.delta, 0)} <small>kg</small></span></td>',
  ],
]);

console.log('graded colours finished (v2)');
