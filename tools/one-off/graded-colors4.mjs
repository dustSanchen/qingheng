/**
 * 收尾：容量表（在 50-onboarding）与饮食条（在 70-rest）的连续配色。
 * 用从源码里抓到的精确锚点。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/50-onboarding.fragment.js', [
  [
    'volume delta grades by growth or drop',
    `<td><span class="stats-trend stats-\${row.delta >= 0 ? 'good' : 'warn'}">\${row.delta >= 0 ? '+' : ''}\${fmt(row.delta, 0)} <small>kg</small></span></td>`,
    `<td><span class="stats-trend" style="color:\${goalColor(row.delta >= 0 ? Math.max(0, 0.35 - Math.min(0.35, (row.prevVolume > 0 ? row.delta / row.prevVolume : 0) * 2.2)) : Math.min(1, 0.35 + Math.abs(row.prevVolume > 0 ? row.delta / row.prevVolume : 0) * 3))}">\${row.delta >= 0 ? '+' : ''}\${fmt(row.delta, 0)} <small>kg</small></span></td>`,
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
]);

console.log('graded colours finished (v3)');
