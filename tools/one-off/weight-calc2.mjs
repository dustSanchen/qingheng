import fs from 'node:fs';

// 计算器逻辑：单侧开关 + 结果回填到当前动作的负重输入
const f = 'app/src/fragments/70-rest.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const start = t.indexOf('  function installWeightCalc() {');
if (start < 0) throw new Error('installWeightCalc not found');
let depth = 0, i = t.indexOf('{', start), end = -1;
for (; i < t.length; i++) {
  if (t[i] === '{') depth++;
  else if (t[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
if (end < 0) throw new Error('unbalanced');

const replacement = [
  '  function installWeightCalc() {',
  '    const open = $("#weight-calc"), sheet = $("#weight-sheet");',
  '    if (!open || !sheet) return;',
  '    const bar = $("#bar-weight"), plate = $("#plate-weight"), perSide = $("#weight-per-side"), out = $("#weight-result");',
  '    const savedBar = Number(localStorage.getItem("qingheng.barWeight") || 0);',
  '    if (savedBar > 0) bar.value = String(savedBar);',
  '    const total = () => {',
  '      const b = Number(bar.value) || 0, p = Number(plate.value) || 0;',
  '      return Math.round((b + (perSide.checked ? 2 * p : p)) * 10) / 10;',
  '    };',
  '    const update = () => {',
  '      const b = Number(bar.value) || 0, p = Number(plate.value) || 0;',
  '      const sum = total();',
  '      out.textContent = perSide.checked',
  '        ? "总重 " + sum + " kg（杆 " + b + " + " + p + " × 2）——这个数填进负重。"',
  '        : "总重 " + sum + " kg（杆 " + b + " + " + p + "）——这个数填进负重。";',
  '    };',
  '    open.addEventListener("click", () => { sheet.hidden = false; update(); });',
  '    $("#weight-close").addEventListener("click", () => { sheet.hidden = true; });',
  '    bar.addEventListener("input", () => { update(); localStorage.setItem("qingheng.barWeight", String(Number(bar.value) || 0)); });',
  '    plate.addEventListener("input", update);',
  '    perSide.addEventListener("change", update);',
  '    const fill = $("#weight-fill");',
  '    if (fill && !fill.dataset.wired) {',
  '      fill.dataset.wired = "1";',
  '      fill.addEventListener("click", () => {',
  '        const inputs = $$("#training-exercises input[name=\\"weight\\"]");',
  '        const target = inputs.find(input => !input.value) || inputs[inputs.length - 1];',
  '        if (!target) { notice("先添加一个动作，再回填负重。"); return; }',
  '        target.value = String(total());',
  '        target.dispatchEvent(new Event("input", {bubbles: true}));',
  '        sheet.hidden = true;',
  '        notice("已填入 " + total() + " kg。");',
  '      });',
  '    }',
  '  }'
].join('\n');

t = t.slice(0, start) + replacement + t.slice(end);
fs.writeFileSync(f, t);
console.log('weight calculator upgraded');
