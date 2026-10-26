import fs from 'node:fs';

const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const start = t.indexOf('function applyTrainingVisibility() {');
if (start < 0) throw new Error('func missing');
let depth = 0, i = t.indexOf('{', start), end = -1;
for (; i < t.length; i++) {
  if (t[i] === '{') depth++;
  else if (t[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
if (end < 0) throw new Error('unbalanced');

const body = [
  'function applyTrainingVisibility() {',
  '    const on = trainingEnabled();',
  '    for (const id of [\'training-log\', \'training-advice\', \'training-volume-card\', \'week-plan-card\', \'training-advice-order\']) {',
  '      const node = document.getElementById(id);',
  '      if (node) node.hidden = !on;',
  '    }',
  '    // 选项卡本身也要消失：记录页的「训练」段、趋势页的「训练」面板、以及任何 training 入口。',
  '    for (const node of document.querySelectorAll(\'[data-records-panel="training"], [data-trends-panel="training"], [data-go="training"], [data-focus="training"]\')) {',
  '      node.hidden = !on;',
  '    }',
  '    for (const id of [\'record-panel-training\', \'trend-panel-training\']) {',
  '      const node = document.getElementById(id);',
  '      if (node) node.hidden = !on;',
  '    }',
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
fs.writeFileSync(f, t);
console.log('applyTrainingVisibility extended to tabs');
