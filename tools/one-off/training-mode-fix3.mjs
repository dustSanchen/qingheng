import fs from 'node:fs';

const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const start = t.indexOf('function applyTrainingVisibility() {');
if (start < 0) throw new Error('function not found');

// 找到函数结尾（花括号配对）
let depth = 0, i = t.indexOf('{', start), end = -1;
for (; i < t.length; i++) {
  if (t[i] === '{') depth++;
  else if (t[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
if (end < 0) throw new Error('unbalanced');

const replacement = [
  'function applyTrainingVisibility() {',
  '    const on = trainingEnabled();',
  '    for (const id of [\'training-log\', \'training-advice\', \'training-volume-card\', \'week-plan-card\', \'training-advice-order\']) {',
  '      const node = document.getElementById(id);',
  '      if (node) node.hidden = !on;',
  '    }',
  '    // Habit tiles filter themselves in renderAll(); there is nothing to re-apply here.',
  '    if (!on) {',
  '      // 关闭训练时，把停留在「训练」段/面板的视图拨回默认，避免出现空白段。',
  '      const recordActive = document.querySelector("[data-records-panel].active, .segment.active[data-records-panel]");',
  '      if (recordActive && recordActive.dataset && recordActive.dataset.recordsPanel === "training") {',
  '        const food = document.querySelector("[data-records-panel=\\"food\\"]");',
  '        if (food) food.click();',
  '      }',
  '      const trendActive = document.querySelector("[data-trends-panel].active, .segment.active[data-trends-panel]");',
  '      if (trendActive && trendActive.dataset && trendActive.dataset.trendsPanel === "training") {',
  '        const weight = document.querySelector("[data-trends-panel=\\"weight\\"]");',
  '        if (weight) weight.click();',
  '      }',
  '      const prefs = document.getElementById("plan-prefs");',
  '      if (prefs) prefs.hidden = true;',
  '    }',
  '  }'
].join('\n');

t = t.slice(0, start) + replacement + t.slice(end);
fs.writeFileSync(f, t);
console.log('applyTrainingVisibility rewritten');
