/**
 * 配色修正：单个 0~1 比值跨绿→琥珀→红会产出橄榄色，且超标只偏一点点时仍是绿。
 * 改为按状态分段插值：
 *  - 区间内：纯净绿，越靠中心越深；
 *  - 低于下限：琥珀 → 橙（按低于的百分比）；
 *  - 超上限：橙红 → 红（按超出上限的百分比，8% 即满红）。
 * 训练容量、体重变化率同样处理。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/00-head.fragment.js', [
  [
    'state-aware colour helpers',
    `  /** True when the user told us they do not train, so training UI should not be shown at all. */`,
    `  /** Inside the range: clean greens, deeper near the centre. */
  function rangeColor(kcal, min, max) {
    const mid = (min + max) / 2, half = Math.max(1, (max - min) / 2);
    const t = Math.abs(kcal - mid) / half; // 0 centre .. 1 edge
    return \`hsl(\${Math.round(132 + 8 * t)} \${Math.round(38 - 8 * t)}% \${Math.round(37 + 6 * t)}%)\`;
  }
  /** Below the floor turns amber, far below turns orange. */
  function underColor(kcal, min) {
    const t = Math.min(1, (min - kcal) / Math.max(200, min * 0.2));
    return \`hsl(\${Math.round(48 - 14 * t)} \${Math.round(58 + 10 * t)}% \${Math.round(50 - 4 * t)}%)\`;
  }
  /** Above the cap turns warm immediately; 8% over is already full red. */
  function overColor(kcal, max) {
    const t = Math.min(1, (kcal - max) / Math.max(60, max * 0.08));
    return \`hsl(\${Math.round(22 - 16 * t)} \${Math.round(62 + 8 * t)}% \${Math.round(48 - 4 * t)}%)\`;
  }
  function dietBarColor(kcal, min, max) {
    if (kcal > max) return overColor(kcal, max);
    if (kcal < min) return underColor(kcal, min);
    return rangeColor(kcal, min, max);
  }
  /** Training volume: growth is green (bigger = deeper), a drop warms up quickly. */
  function volumeColor(delta, previous) {
    const pct = previous > 0 ? delta / previous : 0;
    if (pct >= 0) return \`hsl(\${Math.round(134 - 10 * Math.min(1, pct / 0.15))} \${Math.round(36 - 8 * Math.min(1, pct / 0.15))}% \${Math.round(36 + 4 * Math.min(1, pct / 0.15))}%)\`;
    const t = Math.min(1, -pct / 0.15);
    return \`hsl(\${Math.round(38 - 30 * t)} \${Math.round(60 + 6 * t)}% \${Math.round(48 - 4 * t)}%)\`;
  }
  /** Observed weekly change vs the rate the plan implies. */
  function rateGoalColor(observed, planned) {
    const deviation = Math.abs(observed - planned) / Math.max(0.15, Math.abs(planned));
    if (deviation <= 0.6) return \`hsl(\${Math.round(140 - 26 * (deviation / 0.6))} 34% \${Math.round(38 + 3 * (deviation / 0.6))}%)\`;
    const t = Math.min(1, (deviation - 0.6) / 1.4);
    return \`hsl(\${Math.round(40 - 34 * t)} \${Math.round(60 + 6 * t)}% \${Math.round(48 - 4 * t)}%)\`;
  }
  /** True when the user told us they do not train, so training UI should not be shown at all. */`,
  ],
]);

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'the bar colour comes from the state-aware helper',
    `      // 0 = centre of the range, 0.4 = at an edge, 1 = far outside: green -> amber -> red.
      const mid = (range.min + range.max) / 2, half = Math.max(1, (range.max - range.min) / 2);
      const ratio = kcal > range.max
        ? Math.min(1, 0.4 + 0.6 * ((kcal - range.max) / Math.max(range.max, 1)))
        : kcal < range.min
          ? Math.min(1, 0.4 + 0.6 * ((range.min - kcal) / Math.max(range.min, 1)))
          : 0.4 * (Math.abs(kcal - mid) / half);
      const barColor = recorded ? goalColor(ratio) : 'transparent';`,
    `      // Inside the range stays green; below turns amber, above turns red as it passes the cap.
      const barColor = recorded ? dietBarColor(kcal, range.min, range.max) : 'transparent';`,
  ],
]);

patch('app/src/fragments/50-onboarding.fragment.js', [
  [
    'volume colour via the helper',
    `style="color:\${goalColor(row.delta >= 0 ? Math.max(0, 0.35 - Math.min(0.35, (row.prevVolume > 0 ? row.delta / row.prevVolume : 0) * 2.2)) : Math.min(1, 0.35 + Math.abs(row.prevVolume > 0 ? row.delta / row.prevVolume : 0) * 3))}"`,
    `style="color:\${volumeColor(row.delta, row.prevVolume)}"`,
  ],
  [
    'weight rate colour via the helper',
    `    const rateColor = rateRatio === null ? '' : goalColor(rateRatio);`,
    `    const rateColor = rateRatio === null ? '' : rateGoalColor(observedRate, plannedRate);`,
  ],
]);

console.log('colour mapping rewritten');
