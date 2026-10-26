/**
 * 界面层：今日体检卡、下週计划卡、趋势预警、通用草稿确认。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- 容器 --------------------------------
patch('app/src/main/assets/index.html', [
  [
    'daily check card on today',
    `<article class="card" id="daily-three">`,
    `<article class="card" id="daily-check-card"><div class="card-heading"><h2>今日体检</h2><span class="tag" id="daily-check-tag">—</span></div><div id="daily-check"><p class="muted">正在计算…</p></div></article><article class="card" id="daily-three">`,
  ],
  [
    'week plan card above the training log',
    `<article class="card" id="training-log">`,
    `<article class="card" id="week-plan-card"><div class="card-heading"><h2>下周计划</h2><span class="tag" id="week-plan-tag">按上周表现生成</span></div><div id="week-plan"><p class="muted">还没有足够的训练记录来自动生成；先记两周训练。</p></div></article><article class="card" id="training-log">`,
  ],
  [
    'warnings above the weight chart',
    `<div id="weight-chart" class="chart-wrap"></div>`,
    `<div id="trend-warnings" class="trend-warnings" hidden></div><div id="weight-chart" class="chart-wrap"></div>`,
  ],
]);

// ---------------------------------------------------------------- 渲染 --------------------------------
patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'renderers for check, plan and warnings',
    `  function renderDailyThree() {`,
    `  /** Five-metric check for the selected day, plus the single action to take. */
  function renderDailyCheck() {
    const box = $('#daily-check'), tag = $('#daily-check-tag');
    if (!box) return;
    const meals = (state.meals || []).filter(row => row && row.date === activeDate);
    const habit = habitRowFor(activeDate) || {};
    const profile = effectiveProfileForDate(activeDate);
    const range = intakeRangeForDate(activeDate);
    const check = dailyCheck({meals, habit, range,
      proteinMin: number(profile.proteinMin), proteinMax: number(profile.proteinMax),
      fatMin: number(profile.fatMin), fatMax: number(profile.fatMax)});
    if (tag) tag.textContent = '达标 ' + check.score + '/100';
    box.innerHTML = '<div class="check-grid">' + check.items.map(item =>
      \`<div class="check-item \${item.ok ? 'ok' : 'bad'}"><span class="check-dot" aria-hidden="true"></span><small>\${esc(item.label)}</small><strong>\${esc(String(item.value))}</strong><em>\${esc(item.target)}</em></div>\`).join('') + '</div>'
      + \`<p class="check-action"><strong>今天优先：</strong>\${esc(check.action)}</p>\`;
  }

  /** Two weeks of history -> next week's sessions, with a deload when the load ran hot. */
  function renderWeekPlan() {
    const box = $('#week-plan'), tag = $('#week-plan-tag');
    if (!box) return;
    const loads = dailyLoads(28);
    const stats = acwrFromDailyLoads(loads, activeDate);
    const lastByExercise = {};
    for (let offset = 0; offset < 14; offset++) {
      const day = shiftDay(activeDate, -offset);
      for (const item of exercisesFor(day)) {
        if (!item.name || lastByExercise[item.name]) continue;
        lastByExercise[item.name] = {sets: item.sets, reps: item.reps, weight: item.weight, date: day};
      }
    }
    const sessions = Math.max(1, Math.min(6, Math.round(number(effectiveProfileForDate(activeDate).training) || 3)));
    const startDate = shiftDay(activeDate, 7 - weekdayIndex(activeDate));
    const plan = generateWeekPlan({startDate, sessions, lastByExercise, acwrFlag: stats ? stats.flag : 'ok'});
    if (!plan) { box.innerHTML = '<p class="muted">还没有足够的训练记录来自动生成；先记两周训练。</p>'; return; }
    if (tag) tag.textContent = plan.deload ? '减载周' : '按上周 +2.5%';
    box.innerHTML = '<p class="fine-print">' + esc(plan.note) + '</p>'
      + '<div class="plan-days">' + plan.days.map(day =>
        \`<div class="plan-day"><div class="plan-day-head"><strong>\${esc(day.date.slice(5))}</strong><span>\${esc(TRAINING_TEMPLATES[day.template] || day.template)}</span></div>\`
        + (day.exercises.length ? day.exercises.map(item =>
          \`<div class="plan-item"><span>\${esc(item.name)}</span><b>\${item.sets} × \${item.reps}\${item.weight !== null ? ' · ' + item.weight + ' kg' : ''}</b></div>\`).join('')
          : '<div class="plan-item"><span>还没有可安排的动作</span><b>—</b></div>') + '</div>').join('') + '</div>'
      + \`<div class="button-row"><button type="button" class="button primary" data-plan-schedule="1">一键排课</button></div>\`;
  }

  /** Load and plateau warnings shown above the weight chart. */
  function renderTrendWarnings() {
    const box = $('#trend-warnings');
    if (!box) return;
    const notes = [];
    const stats = acwrFromDailyLoads(dailyLoads(28), activeDate);
    if (stats && stats.flag === 'high') notes.push('训练负荷急增：近 7 天是近 4 周均值的 ' + stats.ratio + ' 倍，建议本周减载或休息一天。');
    if (stats && stats.flag === 'low' && stats.days >= 3) notes.push('训练量偏低：近 7 天只有均值的 ' + stats.ratio + ' 倍，若在减脂期注意保住肌肉量。');
    const weekly = weeklyWeightMeans();
    const plateau = plateauFromWeekly(weekly);
    if (plateau && plateau.plateau) notes.push('体重平台期：最近三周周均在 ' + plateau.mean + ' kg 上下浮动不到 0.2 kg，可以重算维持热量或调整缺口。');
    if (!notes.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = notes.map(note => \`<p class="warn-line">\${esc(note)}</p>\`).join('');
  }

  function renderDailyThree() {`,
  ],
  [
    'small helpers used by the new cards',
    `  /** Five-metric check for the selected day, plus the single action to take. */`,
    `  /** Daily training load (sets × reps × weight; runs count as minutes × 6). */
  function dailyLoads(days) {
    const out = [];
    for (let offset = 0; offset < days; offset++) {
      const day = shiftDay(activeDate, -offset);
      let load = 0;
      for (const item of exercisesFor(day)) {
        const volume = exerciseVolume(item);
        if (volume !== null) load += volume;
        const minutes = number(item.durationMin);
        if (minutes !== null) load += minutes * 6;
      }
      out.push({date: day, load});
    }
    return out;
  }
  /** Weekly mean weights, oldest first, for plateau detection. */
  function weeklyWeightMeans() {
    const byWeek = new Map();
    for (const row of (state.measurements || [])) {
      if (!row || !validDate(row.date)) continue;
      const weight = number(row.weight);
      if (weight === null || weight <= 0) continue;
      const date = new Date(row.date + 'T00:00:00');
      if (Number.isNaN(date.getTime())) continue;
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const week = localDate(monday);
      if (!byWeek.has(week)) byWeek.set(week, []);
      byWeek.get(week).push(weight);
    }
    return [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, values]) => ({week, mean: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length * 10) / 10}));
  }
  /** 0 = Monday … 6 = Sunday. */
  function weekdayIndex(day) {
    const date = new Date(day + 'T00:00:00');
    return Number.isNaN(date.getTime()) ? 0 : (date.getDay() + 6) % 7;
  }

  /** Five-metric check for the selected day, plus the single action to take. */`,
  ],
]);

patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'refresh the new cards with every render',
    `    renderTrainingInsights();`,
    `    renderTrainingInsights();
    renderDailyCheck();
    renderWeekPlan();
    renderTrendWarnings();`,
  ],
]);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.check-grid{')) {
  css += `
/* Daily check: five compact metrics, the weakest one highlighted by colour. */
.check-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:10px}
.check-item{display:flex;flex-direction:column;gap:2px;padding:8px 6px;border:1px solid var(--line);border-radius:12px;background:var(--paper);text-align:center}
.check-item.ok{border-color:#cfe0cb}
.check-item.bad{border-color:#e8cfc9;background:#fdf5f3}
.check-dot{width:7px;height:7px;border-radius:50%;background:#cbd8c8;margin:0 auto}
.check-item.ok .check-dot{background:#6f8f74}
.check-item.bad .check-dot{background:#c9776f}
.check-item small{color:var(--muted);font-size:11px}
.check-item strong{font-size:13px;font-variant-numeric:tabular-nums}
.check-item em{color:var(--muted);font-size:10.5px;font-style:normal}
.check-action{margin:0;padding:8px 10px;border-radius:10px;background:#f6f8f3;font-size:13px}
/* Week plan */
.plan-days{display:flex;flex-direction:column;gap:10px;margin:10px 0}
.plan-day{border:1px solid var(--line);border-radius:12px;padding:8px 10px}
.plan-day-head{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--muted);margin-bottom:4px}
.plan-day-head strong{color:var(--ink)}
.plan-item{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding:2px 0}
.plan-item b{font-variant-numeric:tabular-nums;white-space:nowrap}
/* Warnings */
.trend-warnings{margin:0 0 10px}
.trend-warnings[hidden]{display:none}
.warn-line{margin:0 0 6px;padding:8px 10px;border-radius:10px;background:#fdf5f3;border:1px solid #e8cfc9;font-size:12.5px;color:#8a4b42}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  check/plan/warning styles');
}

console.log('ui layer wired');
