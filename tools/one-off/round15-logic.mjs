import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const NL = '\n';

// ── 1) 缺段检测：并进时段提示
patch('app/src/fragments/00-head.fragment.js', [
  ['missing slot detection',
   '  function renderSlotHint() {',
   [
     '  /** 17 点后没记午餐、21 点后没记晚餐 —— 提示「补一下」，并允许一键跳去记录。 */',
     '  function missingMealSlots(date, now = new Date()) {',
     '    const rows = (Array.isArray(state.meals) ? state.meals : []).filter(row => row && row.date === date);',
     '    const minutes = row => {',
     '      const m = /^(\\d{1,2}):(\\d{2})$/.exec(String(row.mealTime || ""));',
     '      return m ? Number(m[1]) * 60 + Number(m[2]) : null;',
     '    };',
     '    const inWindow = (from, to) => rows.some(row => { const m = minutes(row); return m !== null && m >= from && m < to; });',
     '    const hour = now.getHours();',
     '    const missing = [];',
     '    if (hour >= 17 && !inWindow(630, 900)) missing.push({key: "lunch", label: "午餐"});',
     '    if (hour >= 21 && !inWindow(1020, 1380)) missing.push({key: "dinner", label: "晚餐"});',
     '    return missing;',
     '  }',
     '  function renderSlotHint() {'
   ].join(NL)],
  ['hint mentions the missing meal',
   '    node.textContent = "现在 " + clock + " · " + slot.label + "：" + slot.hint;',
   [
     '    const missing = missingMealSlots(activeDate, now);',
     '    const suffix = missing.length ? "；" + missing.map(item => item.label).join("、") + "好像还没记，点一下去补" : "";',
     '    node.textContent = "现在 " + clock + " · " + slot.label + "：" + slot.hint + suffix;',
     '    node.style.cursor = missing.length ? "pointer" : "";',
     '    node.dataset.missing = missing.length ? missing.map(item => item.key).join(",") : "";',
     '    if (!node.dataset.wired) {',
     '      node.dataset.wired = "1";',
     '      node.addEventListener("click", () => {',
     '        if (!node.dataset.missing) return;',
     '        switchTab("records");',
     '        const field = $("#meal-text"); if (field) { field.focus(); }',
     '      });',
     '    }'
   ].join(NL)],
]);

// ── 2) 今日流水
patch('app/src/fragments/70-rest.fragment.js', [
  ['render the day stream',
   '  /** 今天页的「上次问答」',
   [
     '  /** 把今天发生的事按时间排成一条流水：餐食、训练、体重/睡眠。 */',
     '  function renderDayStream() {',
     '    const box = $("#day-stream");',
     '    if (!box) return;',
     '    const day = activeDate;',
     '    const events = [];',
     '    for (const meal of (Array.isArray(state.meals) ? state.meals : []).filter(row => row && row.date === day)) {',
     '      events.push({time: String(meal.mealTime || ""), sort: meal.mealTime ? 0 : 1, kind: "餐食", text: (meal.name || "一餐") + " · " + Math.round(Number(meal.calories) || 0) + " kcal", tag: meal.mealType || ""});',
     '    }',
     '    const habit = (Array.isArray(state.habits) ? state.habits : []).find(row => row && row.date === day) || {};',
     '    if (habit.training === true || habit.training === "true") {',
     '      const count = Array.isArray(habit.exercises) ? habit.exercises.length : 0;',
     '      events.push({time: String(habit.trainingTime || ""), sort: habit.trainingTime ? 0 : 1, kind: "训练", text: count ? count + " 个动作" : "已标记训练", tag: "训练"});',
     '    }',
     '    if (Number(habit.sleep) > 0) events.push({time: "", sort: 2, kind: "睡眠", text: Number(habit.sleep) + " 小时", tag: "睡眠"});',
     '    if (Number(habit.weight) > 0) events.push({time: "", sort: 2, kind: "体重", text: Number(habit.weight) + " kg", tag: "体重"});',
     '    events.sort((a, b) => a.sort - b.sort || String(a.time).localeCompare(String(b.time)));',
     '    const tag = $("#day-stream-tag");',
     '    if (tag) tag.textContent = events.length ? events.length + " 条" : "暂无";',
     '    box.innerHTML = events.length',
     '      ? events.map(item => "<div class=\\"meal-row list-row\\" role=\\"listitem\\"><div class=\\"row-body\\"><div class=\\"row-head\\"><strong>" + esc(item.time || "未填时间") + "</strong><span class=\\"row-tag\\">" + esc(item.kind) + "</span></div><p class=\\"muted\\">" + esc(item.text) + "</p></div></div>").join("")',
     '      : empty("今天还没有记录", "记一餐、一次训练，流水就会长出来。");',
     '  }',
     '',
     '  /** 今天页的「上次问答」'
   ].join(NL)],
  ['call the day stream after render',
   '  if (typeof renderLastChat === "function") renderLastChat();',
   '  if (typeof renderLastChat === "function") renderLastChat();' + NL + '  if (typeof renderDayStream === "function") renderDayStream();'],
]);

// ── 样式：折叠块与流水
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.day-more')) {
  css += NL + [
    '/* 「更多」折叠：把三张低频卡片收成一行，第一屏只留 5 张。 */',
    '.day-more{margin:0 0 var(--space-3);border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--surface);padding:12px 14px}',
    '.day-more > summary{cursor:pointer;font-size:var(--text-sm);color:var(--muted)}',
    '.day-more[open] > summary{margin-bottom:var(--space-2)}',
    '.day-more .card{border:0;box-shadow:none;padding:var(--space-3) 0;margin:0;border-top:1px solid var(--line);border-radius:0}',
    '.day-more .card:first-of-type{border-top:0}',
    '',
    '/* 今日流水：时间在左，事件在右，一眼看完今天。 */',
    '#day-stream .meal-row{padding:var(--space-2) 0;border-top:1px solid var(--line)}',
    '#day-stream .meal-row:first-child{border-top:0}',
    '#day-stream .row-head strong{font-variant-numeric:tabular-nums;min-width:44px;display:inline-block}',
    ''
  ].join(NL);
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  day-more + stream styles');
}

console.log('round 15 logic wired');
