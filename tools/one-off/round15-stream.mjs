import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const NL = '\n';

// 定义插在 loadStorageStatus 之前（该锚点确定存在）
patch('app/src/fragments/70-rest.fragment.js', [
  ['render the day stream',
   '  async function loadStorageStatus(remirror = false) {',
   [
     '  /** 把今天发生的事按时间排成一条流水：餐食、训练、体重/睡眠。 */',
     '  function renderDayStream() {',
     '    const box = $("#day-stream");',
     '    if (!box) return;',
     '    const day = activeDate;',
     '    const events = [];',
     '    for (const meal of (Array.isArray(state.meals) ? state.meals : []).filter(row => row && row.date === day)) {',
     '      events.push({time: String(meal.mealTime || ""), sort: meal.mealTime ? 0 : 1, kind: "餐食", text: (meal.name || "一餐") + " · " + Math.round(Number(meal.calories) || 0) + " kcal"});',
     '    }',
     '    const habit = (Array.isArray(state.habits) ? state.habits : []).find(row => row && row.date === day) || {};',
     '    if (habit.training === true || habit.training === "true") {',
     '      const count = Array.isArray(habit.exercises) ? habit.exercises.length : 0;',
     '      events.push({time: "", sort: 2, kind: "训练", text: count ? count + " 个动作" : "已标记训练"});',
     '    }',
     '    if (Number(habit.sleep) > 0) events.push({time: "", sort: 3, kind: "睡眠", text: Number(habit.sleep) + " 小时"});',
     '    if (Number(habit.weight) > 0) events.push({time: "", sort: 3, kind: "体重", text: Number(habit.weight) + " kg"});',
     '    events.sort((a, b) => a.sort - b.sort || String(a.time).localeCompare(String(b.time)));',
     '    const tag = $("#day-stream-tag");',
     '    if (tag) tag.textContent = events.length ? events.length + " 条" : "暂无";',
     '    box.innerHTML = events.length',
     '      ? events.map(item => "<div class=\\"meal-row list-row\\" role=\\"listitem\\"><div class=\\"row-body\\"><div class=\\"row-head\\"><strong>" + esc(item.time || "未填时间") + "</strong><span class=\\"row-tag\\">" + esc(item.kind) + "</span></div><p class=\\"muted\\">" + esc(item.text) + "</p></div></div>").join("")',
     '      : empty("今天还没有记录", "记一餐、一次训练，流水就会长出来。");',
     '  }',
     '',
     '  async function loadStorageStatus(remirror = false) {'
   ].join(NL)],
  ['call the day stream after the last chat',
   '    if (typeof renderLastChat === "function") renderLastChat();',
   '    if (typeof renderLastChat === "function") renderLastChat();' + NL + '    if (typeof renderDayStream === "function") renderDayStream();'],
]);

console.log('day stream wired');
