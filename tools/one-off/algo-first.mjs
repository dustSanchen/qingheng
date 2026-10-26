import fs from 'node:fs';

const f = 'app/src/fragments/40-targets.fragment.js';
let t = fs.readFileSync(f, 'utf8');
let n = 0;

// 1) 去掉「有自定义区间就跳过预设」的门槛：算法优先
const gate = "if (goal !== 'lean' && input.applyGoalPresets === true && !customRanges) {";
if (t.includes(gate)) {
  t = t.replace(gate, "if (goal !== 'lean') {");
  n++; console.log('ok presets always apply');
}

// 2) 预设之后，把显式口径作为「事后调整」叠加
if (!t.includes('// 口径事后调整')) {
  const marker = 'proteinMin = Math.round(w * proteinPerKgMin);';
  const i = t.indexOf(marker);
  if (i < 0) throw new Error('proteinMin marker missing');
  const lineStart = t.lastIndexOf('\n', i) + 1;
  const apply = [
    '    // 口径事后调整：算法先给区间，用户再用口径抬高/压低上下限。',
    '    if (input.rules) {',
    '      const clampRange = (range, min, max) => ({',
    '        min: min ? Math.max(floor, Math.round(min)) : range.min,',
    '        max: max ? Math.max(floor, Math.round(max)) : range.max',
    '      });',
    '      trainingDay = clampRange(trainingDay, input.rules.trainingDayMin, input.rules.trainingDayMax);',
    '      restDay = clampRange(restDay, input.rules.restDayMin, input.rules.restDayMax);',
    '    }',
    ''
  ].join('\n');
  t = t.slice(0, lineStart) + apply + t.slice(lineStart);
  n++; console.log('ok post-hoc 口径 overrides');
}

fs.writeFileSync(f, t);
console.log('changes:', n);
