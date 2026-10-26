import fs from 'node:fs';

const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');
let n = 0;

// 1) 把隐藏逻辑抽成可重复调用的函数，并在渲染后再补一次（按钮是 JS 后建的）
if (!t.includes('function hideTrainingTabs(')) {
  const anchor = 'function applyTrainingVisibility() {';
  const helper = [
    'function hideTrainingTabs(on) {',
    '    const selector = \'[data-records-panel="training"], [data-trends-panel="training"], [data-go="training"], [data-focus="training"]\';',
    '    for (const node of document.querySelectorAll(selector)) node.hidden = !on;',
    '    for (const id of [\'record-panel-training\', \'trend-panel-training\']) {',
    '      const node = document.getElementById(id);',
    '      if (node) node.hidden = !on;',
    '    }',
    '  }',
    ''
  ].join('\n');
  t = t.replace(anchor, helper + anchor);
  n++; console.log('ok helper');
}

// 2) applyTrainingVisibility 用新函数，并在微任务里再补一次
const start = t.indexOf('function applyTrainingVisibility() {');
let depth = 0, i = t.indexOf('{', start), end = -1;
for (; i < t.length; i++) {
  if (t[i] === '{') depth++;
  else if (t[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const body = [
  'function applyTrainingVisibility() {',
  '    const on = trainingEnabled();',
  '    for (const id of [\'training-log\', \'training-advice\', \'training-volume-card\', \'week-plan-card\', \'training-advice-order\']) {',
  '      const node = document.getElementById(id);',
  '      if (node) node.hidden = !on;',
  '    }',
  '    hideTrainingTabs(on);',
  '    // 分段按钮由 JS 在渲染后创建，这里再补一次，避免第一次调用时还找不到节点。',
  '    if (typeof setTimeout === "function") setTimeout(() => hideTrainingTabs(trainingEnabled()), 0);',
  '    if (!on) {',
  '      const recordActive = document.querySelector(\'[data-records-panel].active\');',
  '      if (recordActive && recordActive.dataset.recordsPanel === "training") {',
  '        const food = document.querySelector(\'[data-records-panel="food"]\');',
  '        if (food) food.click();',
  '      }',
  '      const trendActive = document.querySelector(\'[data-trends-panel].active\');',
  '      if (trendActive && trendActive.dataset.trendsPanel === "training") {',
  '        const weight = document.querySelector(\'[data-trends-panel="weight"]\');',
  '        if (weight) weight.click();',
  '      }',
  '      const prefs = document.getElementById("plan-prefs");',
  '      if (prefs) prefs.hidden = true;',
  '    }',
  '  }'
].join('\n');
t = t.slice(0, start) + body + t.slice(end);
n++; console.log('ok rewritten');

fs.writeFileSync(f, t);
console.log('changes:', n);
