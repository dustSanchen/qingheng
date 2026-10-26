import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const NL = '\n';

// 1) 时段判定 + 渲染
patch('app/src/fragments/00-head.fragment.js', [
  ['time-of-day slot helper',
   '  /** Inside the range: clean greens, deeper near the centre. */',
   [
     '  /** 一天里的时段：决定「现在最该记什么」，而不是让用户面对 9 张卡自己找。 */',
     '  function daySlot(now = new Date()) {',
     '    const hour = now.getHours();',
     '    if (hour >= 5 && hour < 10) return {key: "morning", label: "早上", hint: "记体重、睡眠，顺手看一眼今天目标"};',
     '    if (hour >= 10 && hour < 14) return {key: "noon", label: "中午", hint: "记午餐；早上没记的话，趁现在补上体重"};',
     '    if (hour >= 14 && hour < 17) return {key: "afternoon", label: "下午", hint: "有加餐或训练就记一笔，晚上会轻松很多"};',
     '    if (hour >= 17 && hour < 22) return {key: "evening", label: "晚上", hint: "记晚餐 + 训练，再看一眼今天还差多少"};',
     '    return {key: "night", label: "夜里", hint: "只补记录，不追额度；睡够比凑数字重要"};',
     '  }',
     '  function renderSlotHint() {',
     '    const node = $("#slot-hint");',
     '    if (!node) return;',
     '    const now = new Date();',
     '    const slot = daySlot(now);',
     '    const clock = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");',
     '    node.textContent = "现在 " + clock + " · " + slot.label + "：" + slot.hint;',
     '    node.dataset.slot = slot.key;',
     '    for (const button of $$("[data-go]")) {',
     '      const target = button.dataset.go;',
     '      const spotlight = (slot.key === "evening" || slot.key === "noon") && target === "records";',
     '      button.classList.toggle("is-now", spotlight);',
     '    }',
     '  }',
     '  /** Inside the range: clean greens, deeper near the centre. */'
   ].join(NL)],
]);

// 2) 标记：能量卡上方一行时段提示
patch('app/src/main/assets/index.html', [
  ['slot hint line',
   '<article class="card energy-card"><div class="card-heading"><h2>今日能量</h2>',
   '<p class="slot-hint" id="slot-hint">—</p><article class="card energy-card"><div class="card-heading"><h2>今日能量</h2>'],
]);

// 3) 接到渲染与启动
patch('app/src/fragments/10-rich-answer.fragment.js', [
  ['render slot hint',
   '    applyTrainingVisibility();',
   '    applyTrainingVisibility();' + NL + '    if (typeof renderSlotHint === "function") renderSlotHint();'],
]);

// 4) 样式
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.slot-hint')) {
  css += NL + [
    '/* Time-of-day hint: one line that says what to log right now. */',
    '.slot-hint{margin:0 0 var(--space-2);padding:8px 12px;border-radius:var(--radius-sm);background:var(--surface-soft);color:var(--body-text);font-size:var(--text-sm);line-height:1.6}',
    '.slot-hint[data-slot="night"]{background:transparent;padding-left:0;color:var(--muted)}',
    '.button.is-now{outline:2px solid var(--accent);outline-offset:2px}',
    ''
  ].join(NL);
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  slot hint styles');
}

console.log('slot guidance wired');
