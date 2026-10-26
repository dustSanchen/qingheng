/**
 * 饮食趋势：
 *  - 进度条改为「占当天目标上限的百分比」：不足时也能看到一段真实的长度，而不是贴边看不见；
 *  - 三种状态着色：区间内=绿，不足=琥珀，超上限=红，未记录=空条；
 *  - 数字补上 kcal 单位，并在说明里给出颜色图例。
 */
import {patch} from '../lib/patch.mjs';
import fs from 'node:fs';

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'bars are a percentage of the day upper bound, coloured by state',
    `    const rows = days.map(day => {
      const meals = (state.meals || []).filter(row => row.date === day);
      const totals = totalsFor(meals);
      const range = intakeRangeForDate(day);
      const span = range.max - range.min || 1;
      const position = Math.max(0, Math.min(100, Math.round((((totals.calories ?? 0) - range.min) / span) * 100)));
      const over = (totals.calories ?? 0) > range.max;
      return \`<div class="diet-day"><span class="diet-day-label">\${day.slice(5)}</span><span class="diet-bar" role="img" aria-label="\${Math.round(totals.calories ?? 0)} kcal，目标 \${range.min}~\${range.max}"><i style="width:\${position}%" class="\${over ? 'over' : ''}"></i></span><span class="diet-day-value">\${meals.length ? Math.round(totals.calories ?? 0) : '—'}</span></div>\`;
    }).join('');`,
    `    const rows = days.map(day => {
      const meals = (state.meals || []).filter(row => row.date === day);
      const totals = totalsFor(meals);
      const range = intakeRangeForDate(day);
      const kcal = Math.round(totals.calories ?? 0);
      const recorded = meals.length > 0;
      // Width is the share of the day's upper bound, so a day below the range still shows how far it got.
      const percent = recorded ? Math.max(4, Math.min(100, Math.round((kcal / Math.max(range.max, 1)) * 100))) : 0;
      const stateKey = !recorded ? 'empty' : kcal > range.max ? 'over' : kcal < range.min ? 'low' : 'in';
      const label = recorded
        ? \`\${kcal} kcal，算 \${percent}%，目标 \${range.min}~\${range.max} kcal（\${{in: '区间内', low: '不足', over: '超上限'}[stateKey]}）\`
        : \`未记录，目标 \${range.min}~\${range.max} kcal\`;
      return \`<div class="diet-day"><span class="diet-day-label">\${day.slice(5)}</span><span class="diet-bar" role="img" aria-label="\${label}"><i class="\${stateKey}" style="width:\${percent}%"></i></span><span class="diet-day-value">\${recorded ? \`\${kcal} kcal\` : '—'}</span></div>\`;
    }).join('');`,
  ],
  [
    'the legend explains the colours',
    `card.innerHTML = \`<div class="card-heading"><h2>饮食趋势</h2><span class="tag">近 7 天 · 有记录 \${logged}/7</span></div><p class="muted">每根条相对当天的目标区间；超出上限会标红。</p><div class="diet-bars">\${rows}</div>\`;`,
    `card.innerHTML = \`<div class="card-heading"><h2>饮食趋势</h2><span class="tag">近 7 天 · 有记录 \${logged}/7</span></div>\`
      + \`<p class="muted">条形长度 = 占当天目标上限的百分比 · <span class="diet-key in">区间内</span> <span class="diet-key low">不足</span> <span class="diet-key over">超上限</span></p>\`
      + \`<div class="diet-bars">\${rows}</div>\`;`,
  ],
]);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.diet-bar i.in{')) {
  css += `
/* Bar colour states: inside the range is green, short is amber, over the cap is red. */
.diet-bar i.low{background:#d9a441}
.diet-bar i.empty{background:transparent}
.diet-day-value{font-variant-numeric:tabular-nums;white-space:nowrap}
.diet-key{display:inline-flex;align-items:center;gap:4px;margin-left:8px;font-size:12px}
.diet-key::before{content:'';width:8px;height:8px;border-radius:2px;background:currentColor;opacity:.85}
.diet-key.in{color:#5f8467}
.diet-key.low{color:#b98524}
.diet-key.over{color:#c9776f}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  diet bar states');
} else console.log('skip diet bar states');

console.log('diet bars percentage + units wired');
