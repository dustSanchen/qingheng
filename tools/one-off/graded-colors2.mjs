/**
 * 剩余三处连续配色（都在 50-onboarding 的体重卡与 70-rest 的容量表、饮食条里）：
 *  1. 饮食条的背景色按偏离目标的程度连续变化；
 *  2. 首末变化按「与计划周变化率的接近程度」着色；
 *  3. 训练容量的变化量按增长/掉量幅度着色。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/50-onboarding.fragment.js', [
  [
    'grade the weight delta against the planned rate',
    `    const delta = Number(last.weight)-Number(first.weight);`,
    `    const delta = Number(last.weight)-Number(first.weight);
    // Observed weekly rate vs the rate the current plan implies; the closer they are, the greener.
    const spanDays = Math.max(1, Math.round((dayTime(last.date) - dayTime(first.date)) / 86400000));
    const plannedRate = intakeRangeForDate(last.date).expectedWeeklyKg;
    const observedRate = spanDays >= 7 ? (delta / spanDays) * 7 : null;
    const rateRatio = plannedRate === null || observedRate === null || plannedRate === 0
      ? null
      : Math.min(1, Math.abs(observedRate - plannedRate) / Math.max(0.2, Math.abs(plannedRate) * 1.5));
    const rateColor = rateRatio === null ? '' : \` style="color:\${goalColor(rateRatio)}"\`;
    const rateNote = rateRatio === null ? '' : \` · 计划每周 \${plannedRate > 0 ? '+' : ''}\${fmt(plannedRate, 2)} kg\`;`,
  ],
  [
    'show that colour and the planned rate',
    `'<div><small>范围内首末变化</small><strong>\${points.length<2?'—':\`\${delta>0?'+':''}\${fmt(delta)}\`} <small>\${points.length<2?'需至少两次测量':'kg'}</small></strong></div>'`,
    `\`<div><small>范围内首末变化\${rateNote}</small><strong\${rateColor}>\${points.length<2?'—':\`\${delta>0?'+':''}\${fmt(delta)}\`} <small>\${points.length<2?'需至少两次测量':'kg'}</small></strong></div>\``,
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
    `<i class="\${stateKey}" style="width:\${percent}%"></i>`,
    `<i class="\${stateKey}" style="width:\${percent}%;background:\${barColor}"></i>`,
  ],
  [
    'volume deltas grade instead of two buckets',
    `<td><span class="stats-trend stats-\${row.delta >= 0 ? 'good' : 'warn'}">\${row.delta >= 0 ? '+' : ''}\${fmt(row.delta, 0)} <small>kg</small></span></td>`,
    `\`<td><span class="stats-trend" style="color:\${goalColor(row.delta >= 0 ? Math.max(0, 0.35 - Math.min(0.35, (row.prevVolume > 0 ? row.delta / row.prevVolume : 0) * 2.2)) : Math.min(1, 0.35 + Math.abs(row.prevVolume > 0 ? row.delta / row.prevVolume : 0) * 3))}">\${row.delta >= 0 ? '+' : ''}\${fmt(row.delta, 0)} <small>kg</small></span></td>\``,
  ],
]);

console.log('graded colours finished');
