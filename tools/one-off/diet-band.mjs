/**
 * 区间带：每根条上叠加一段浅绿，表示当天目标区间在整条量程中的位置。
 *  量程 = 0 … 上限×1.08，这样区间带不会贴在最右边缘，超出上限的部分会明显跨过带的右沿。
 *  条长仍按「占上限的百分比」画，颜色沿用 dietBarColor 的分段规则。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'the bar carries a band for the acceptable range',
    `      const percent = recorded ? Math.max(4, Math.min(100, Math.round((kcal / Math.max(range.max, 1)) * 100))) : 0;`,
    `      // Scale a little past the cap so the acceptable band sits inside the track rather than against its edge.
      const scaleMax = Math.max(range.max * 1.08, 1);
      const percent = recorded ? Math.max(4, Math.min(100, Math.round((kcal / scaleMax) * 100))) : 0;
      const bandLeft = Math.max(0, Math.min(100, (range.min / scaleMax) * 100));
      const bandWidth = Math.max(2, Math.min(100 - bandLeft, ((range.max - range.min) / scaleMax) * 100));`,
  ],
  [
    'render the band under the fill',
    `<span class="diet-bar" role="img" aria-label="\${label}"><i class="\${stateKey}" style="width:\${percent}%;background:\${barColor}"></i></span>`,
    `<span class="diet-bar" role="img" aria-label="\${label}"><span class="diet-band" style="left:\${bandLeft.toFixed(1)}%;width:\${bandWidth.toFixed(1)}%"></span><i class="\${stateKey}" style="width:\${percent}%;background:\${barColor}"></i></span>`,
  ],
  [
    'the aria label mentions the band',
    `        ? \`\${kcal} kcal，算 \${percent}%，目标 \${range.min}~\${range.max} kcal（\${{in: '区间内', low: '不足', over: '超上限'}[stateKey]}）\``,
    `        ? \`\${kcal} kcal，占上限 \${percent}%，目标区间 \${range.min}~\${range.max} kcal（\${{in: '区间内', low: '不足', over: '超上限'}[stateKey]}）\``,
  ],
  [
    'the caption explains the band',
    `      + \`<p class="muted">条形长度 = 占当天目标上限的百分比 · <span class="diet-key in">区间内</span> <span class="diet-key low">不足</span> <span class="diet-key over">超上限</span></p>\``,
    `      + \`<p class="muted">条形长度 = 占当天目标上限的百分比 · 浅绿带 = 当天目标区间 · <span class="diet-key in">区间内</span> <span class="diet-key low">不足</span> <span class="diet-key over">超上限</span></p>\``,
  ],
]);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.diet-band{')) {
  css += `
/* The acceptable range drawn inside the track, so a bar can be read against it at a glance. */
.diet-band{position:absolute;top:0;bottom:0;border-radius:3px;background:#d8e6d5;box-shadow:inset 0 0 0 1px #bfd5bb}
.diet-bar i{position:relative;z-index:1;opacity:.92}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  band styles');
} else console.log('skip band styles');

console.log('range band wired');
