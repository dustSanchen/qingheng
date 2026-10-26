/**
 * P0-3 今日能量卡给动作 + P1-5 训练进阶判定。
 *
 * 能量卡现在只下结论（「超出 187 kcal」）；补一行可执行的下一步：优先补多少蛋白质、限油、别再加餐。
 * 训练窗口补「停滞 / 减量 / 换动作」三条判定，数据全部来自已有的训练日志与周容量。
 */
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- HTML ------------------------------
patch('app/src/main/assets/index.html', [
  [
    'action line under the calorie caption',
    `<p class="muted" id="calorie-caption">记录一餐，让今天更清晰。</p>`,
    `<p class="muted" id="calorie-caption">记录一餐，让今天更清晰。</p><p class="fine-print" id="calorie-action"></p>`,
  ],
  [
    'insight line in the training card',
    `<div class="button-row" id="training-advice-chips"></div>`,
    `<div id="training-advice-insights" class="list-stack" role="list"></div><div class="button-row" id="training-advice-chips"></div>`,
  ],
]);

// ---------------------------------------------------------------- JS --------------------------------
patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'energy card action line',
    `    $('#macro-summary').innerHTML = [['protein','蛋白质',p.proteinMin,p.proteinMax],['fat','脂肪',p.fatMin,p.fatMax],['carbs','碳水',null,carbCap(p)]]`,
    `    // What to do next, not just how far off the target is: the numbers are useless without an action.
    const actionBox = $('#calorie-action');
    if (actionBox) {
      const parts = [];
      const protein = number(totals.protein), proteinMin = number(p.proteinMin), fat = number(totals.fat), fatMax = number(p.fatMax), kcal = number(totals.calories), cap = range ? range.max : number(p.calorieTarget);
      if (protein !== null && proteinMin !== null && protein < proteinMin) {
        const gap = proteinMin - protein;
        const grams = Math.ceil(gap * 100 / 19);
        parts.push(\`优先补蛋白：还差 \${fmt(gap,0)} g ≈ 白灼虾 \${grams} g（或水煮蛋 \${Math.ceil(gap / 6.3)} 个）\`);
      }
      if (fat !== null && fatMax !== null && fat > fatMax) parts.push(\`脂肪超 \${fmt(fat - fatMax,0)} g：今天剩下的菜改白灼/清蒸，别再额外加油\`);
      if (kcal !== null && cap !== null && kcal > cap) parts.push(\`热量已超上限 \${fmt(kcal - cap,0)} kcal：不再加餐，晚餐只吃蛋白 + 蔬菜\`);
      if (!parts.length && protein !== null && proteinMin !== null && protein >= proteinMin) parts.push('蛋白质已达标，剩下的按热量额度分配到主食与蔬菜即可。');
      actionBox.textContent = parts.join('；');
    }
    $('#macro-summary').innerHTML = [['protein','蛋白质',p.proteinMin,p.proteinMax],['fat','脂肪',p.fatMin,p.fatMax],['carbs','碳水',null,carbCap(p)]]`,
  ],
  [
    'render the training insights with everything else',
    `    renderChat();
    renderTargetStatus();`,
    `    renderChat();
    renderTrainingInsights();
    renderTargetStatus();`,
  ],
  [
    'training insight logic',
    `  /** The 今天-page window: training questions only, with its own consent gate. */`,
    `  /**
   * Three things the log can already answer: which lift stopped moving, whether this week is a deload
   * candidate, and what to swap a stalled lift for. All of it comes from the recorded weekly volume.
   */
  function trainingInsights() {
    const habits = Array.isArray(state.habits) ? state.habits : [];
    const byWeek = new Map();
    for (const row of habits) {
      const date = String(row.date || '');
      if (!validDate(date) || !Array.isArray(row.exercises)) continue;
      const week = weekStart(date);
      for (const item of row.exercises) {
        const name = String(item && item.name || '').trim();
        const sets = number(item && item.sets), reps = number(item && item.reps), weight = number(item && item.weight);
        if (!name || sets === null || reps === null || weight === null) continue;
        if (!byWeek.has(name)) byWeek.set(name, new Map());
        const weeks = byWeek.get(name);
        weeks.set(week, (weeks.get(week) || 0) + sets * reps * weight);
      }
    }
    const insights = [];
    const swaps = {'深蹲': '腿举', '卧推': '上斜哑铃卧推', '硬拉': '罗马尼亚硬拉', '划船': '引体向上', '肩推': '侧平举', '腿举': '保加利亚分腿蹲'};
    let weeklyTotal = 0, lastWeekTotal = 0;
    for (const [name, weeks] of byWeek) {
      const keys = [...weeks.keys()].sort();
      if (keys.length < 2) continue;
      const last = weeks.get(keys[keys.length - 1]), prev = weeks.get(keys[keys.length - 2]);
      if (prev > 0 && last <= prev * 1.02) {
        const swap = swaps[name];
        insights.push(\`\${name} 连续两周没有进步（\${fmt(prev,0)} → \${fmt(last,0)} kg 容量）\${swap ? \`，可以换成 \${swap} 4~6 周\` : ''}\`);
      }
    }
    const allWeeks = new Map();
    for (const [name, weeks] of byWeek) for (const [week, volume] of weeks) allWeeks.set(week, (allWeeks.get(week) || 0) + volume);
    const weekKeys = [...allWeeks.keys()].sort();
    if (weekKeys.length >= 3) {
      const recent = allWeeks.get(weekKeys[weekKeys.length - 1]);
      const baseline = weekKeys.slice(-4, -1).reduce((sum, key) => sum + allWeeks.get(key), 0) / Math.max(1, weekKeys.slice(-4, -1).length);
      if (baseline > 0 && recent > baseline * 1.25) insights.push(\`本周总容量 \${fmt(recent,0)} 比近三周均值高 \${fmt((recent / baseline - 1) * 100,0)}%，下周可以减量 40% 当作 deload\`);
    }
    const trained = (state.habits || []).some(row => row && row.date === localDate() && (row.training === true || row.training === 'true'));
    if (!insights.length) insights.push(trained ? '今天已训练；容量连续两周上升就说明渐进超负荷在生效。' : '今天还没记录训练；练完记一条，下一周就能看出哪个动作停了。');
    return insights.slice(0, 3);
  }
  /** Renders those insights into the 今天-page training card. */
  function renderTrainingInsights() {
    const box = $('#training-advice-insights');
    if (!box) return;
    box.innerHTML = trainingInsights().map(text => \`<p class="fine-print">· \${esc(text)}</p>\`).join('');
  }
  /** The 今天-page window: training questions only, with its own consent gate. */`,
  ],
]);

console.log('P0-3 + P1-5 wired');
