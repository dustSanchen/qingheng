import fs from 'node:fs';
const file='app/src/fragments/40-targets.fragment.js';
let t=fs.readFileSync(file,'utf8');
const crlf=t.includes('\r\n'); if(crlf) t=t.replace(/\r\n/g,'\n');

const anchor = "  const RULE_KEYS = Object.keys(TARGET_RULES);";
const add = `  /**
   * Goal presets: the deficit each goal plans (negative = surplus) and the protein band it needs.
   * Presets live *inside* the 口径 — the intake floor and the deficit cap still win, and a plan that
   * cannot fit is reported instead of silently trimmed.
   */
  const GOAL_PRESETS = {
    gain:     {deficitPercent: -8, proteinPerKgMin: 2.0, proteinPerKgMax: 2.2},
    recomp:   {deficitPercent: 8,  proteinPerKgMin: 2.0, proteinPerKgMax: 2.2},
    cut:      {deficitPercent: 18, proteinPerKgMin: 2.2, proteinPerKgMax: 2.4},
    maintain: {deficitPercent: 0,  proteinPerKgMin: 1.6, proteinPerKgMax: 2.0},
    lean:     {deficitPercent: 12, proteinPerKgMin: 2.2, proteinPerKgMax: 2.4}
  };
  const RULE_KEYS = Object.keys(TARGET_RULES);`;
if(t.split(anchor).length-1 !== 1) throw new Error('RULE_KEYS anchor missing');
t = t.replace(anchor, add);

const labelFrom = "  const GOAL_LABEL = {gain: '增肌', cut: '减脂', recomp: '增肌同时减脂', maintain: '保持身材'};";
const labelTo = "  const GOAL_LABEL = {gain: '增肌', cut: '减脂', recomp: '增肌同时减脂', maintain: '保持身材', lean: '薄肌（线条）'};";
if(t.split(labelFrom).length-1 !== 1) throw new Error('GOAL_LABEL anchor missing');
t = t.replace(labelFrom, labelTo);

// Lean needs its own loss-rate reading in the status line.
const leanLine = "      if (leanPlan.lossRatePercent !== null && leanPlan.lossRatePercent > 0.7)";
t = t.replace(leanLine, leanLine);
if(crlf) t=t.replace(/\n/g,'\r\n');
fs.writeFileSync(file, t);
console.log('GOAL_PRESETS + GOAL_LABEL.lean added');

// The profile form needs the fourth option.
const html='app/src/main/assets/index.html';
let h=fs.readFileSync(html,'utf8');
const optAnchor = '         <label class="goal-card"><input type="radio" name="goal" value="maintain">';
if(!h.includes('value="lean"')){
  const card = '         <label class="goal-card"><input type="radio" name="goal" value="lean"><span><strong>薄肌（线条）</strong><small>小缺口 + 蛋白拉满，低体脂下的肌肉分离度</small></span></label>\n';
  const n = h.split(optAnchor).length-1;
  if(n!==1) throw new Error('goal card anchor missing');
  h = h.replace(optAnchor, card + optAnchor);
  fs.writeFileSync(html, h);
  console.log('goal card 薄肌 added');
} else console.log('skip goal card');
