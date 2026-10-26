import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const NL = '\n';

// 1) 训练日志卡：一行口径说明 + 「算一下」
patch('app/src/main/assets/index.html', [
  ['weight convention hint',
   '<p class="muted">动作 · 组数 · 次数 · 负重；容量变化在趋势页看。</p>',
   '<p class="muted">动作 · 组数 · 次数 · 负重；容量变化在趋势页看。</p><p class="fine-print" id="weight-help">负重记<strong>总重量</strong>：杠铃 = 杆重 + 两侧片重；哑铃按<strong>单只</strong>记；器械按配重片标示。<button type="button" class="text-button" id="weight-calc">算一下</button></p>'],
  ['weight calculator sheet',
   '<div class="term-sheet" id="term-sheet"',
   [
     '<div class="term-sheet" id="weight-sheet" hidden role="dialog" aria-modal="true" aria-labelledby="weight-title"><div class="term-panel"><div class="term-head"><strong id="weight-title">杠铃总重怎么算</strong><button type="button" class="term-close" id="weight-close" aria-label="关闭">×</button></div><label class="weight-row">杆重 · kg<input type="number" id="bar-weight" value="20" min="0" max="60" step="0.5" inputmode="decimal"></label><label class="weight-row">每侧片重 · kg<input type="number" id="plate-weight" value="15" min="0" max="100" step="0.5" inputmode="decimal"></label><p class="term-line" id="weight-result">—</p><p class="fine-print">两侧对称时：总重 = 杆重 + 2 × 每侧片重。单侧递进（比如只加一边）按实际总重填。</p></div></div>',
     '<div class="term-sheet" id="term-sheet"'
   ].join(NL)],
]);

// 2) 逻辑
patch('app/src/fragments/70-rest.fragment.js', [
  ['weight calculator logic',
   '  /** 皮肤：attribute + localStorage',
   [
     '  /** 杠铃总重计算器：杆重 + 2 × 每侧片重。 */',
     '  function installWeightCalc() {',
     '    const open = $("#weight-calc"), sheet = $("#weight-sheet");',
     '    if (!open || !sheet) return;',
     '    const bar = $("#bar-weight"), plate = $("#plate-weight"), out = $("#weight-result");',
     '    const update = () => {',
     '      const b = Number(bar.value) || 0, p = Number(plate.value) || 0;',
     '      const total = Math.round((b + 2 * p) * 10) / 10;',
     '      out.textContent = "总重 " + total + " kg（杆 " + b + " + " + p + " × 2）——这个数填进负重。";',
     '    };',
     '    open.addEventListener("click", () => { sheet.hidden = false; update(); });',
     '    $("#weight-close").addEventListener("click", () => { sheet.hidden = true; });',
     '    bar.addEventListener("input", update);',
     '    plate.addEventListener("input", update);',
     '  }',
     '',
     '  /** 皮肤：attribute + localStorage'
   ].join(NL)],
  ['install the calculator on boot',
   '    if (typeof renderLastChat === "function") renderLastChat();',
   '    if (typeof renderLastChat === "function") renderLastChat();' + NL + '    if (typeof installWeightCalc === "function") installWeightCalc();'],
]);

// 3) 术语表补「负重」
patch('app/src/fragments/00-head.fragment.js', [
  ['weight term in glossary',
   '    "离心": {full: "Eccentric，下放阶段"',
   [
     '    "负重": {full: "Training Load，这一组用的重量", meaning: "按总重量记：杠铃 = 杆重 + 两侧片重（15 kg/侧 + 20 kg 杆 = 50 kg）；哑铃按单只记；器械按配重片标示。", caution: "同一动作前后口径必须一致，否则容量、ACWR 与进步曲线都会失真。"},',
     '    "离心": {full: "Eccentric，下放阶段"'
   ].join(NL)],
]);

// 4) 样式
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.weight-row')) {
  css += NL + [
    '.weight-row{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin:var(--space-2) 0;font-size:var(--text-sm);color:var(--body-text)}',
    '.weight-row input{width:96px;text-align:right}',
    '#weight-result{font-weight:600;color:var(--ink)}',
    ''
  ].join(NL);
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  weight styles');
}

console.log('weight convention wired');
