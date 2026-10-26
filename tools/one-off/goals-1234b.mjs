import fs from 'node:fs';

const f = 'app/src/fragments/40-targets.fragment.js';
let t = fs.readFileSync(f, 'utf8');
let n = 0;

// #2 蛋白分档 + #4 盈余分级
if (!t.includes('function proteinBandFor(')) {
  const anchor = 'RULE_KEYS = Object.keys(TARGET_RULES);';
  const i = t.indexOf(anchor);
  if (i < 0) throw new Error('RULE_KEYS missing');
  const insertAt = i + anchor.length;
  const helper = [
    '',
    '  /** 蛋白区间按缺口幅度分档（ISSN 2017：缺口期 2.3~3.1，越大越靠上限）。 */',
    '  function proteinBandFor(goal, gapPercent) {',
    '    if (goal === \'maintain\') return {min: 1.6, max: 2.0};',
    '    const gap = Math.abs(Number(gapPercent) || 0);',
    '    if (gap < 10) return {min: 2.0, max: 2.2};',
    '    if (gap <= 20) return {min: 2.3, max: 2.5};',
    '    return {min: 2.5, max: 2.8};',
    '  }',
    '  /** 增肌盈余按训练年限分级。 */',
    '  function surplusForYears(years) {',
    '    const y = Number(years);',
    '    if (!Number.isFinite(y) || y <= 0) return 8;',
    '    if (y < 1) return 10;',
    '    if (y <= 3) return 8;',
    '    return 5;',
    '  }'
  ].join('\n');
  t = t.slice(0, insertAt) + helper + t.slice(insertAt);
  n++; console.log('ok helpers');
}

// #1 非薄肌目标按各自缺口算区间
if (!t.includes('non-lean goal ranges')) {
  const marker = 'proteinMin = Math.round(w * proteinPerKgMin);';
  const i = t.indexOf(marker);
  if (i < 0) throw new Error('proteinMin marker missing');
  const lineStart = t.lastIndexOf('\n', i) + 1;
  const branch = [
    '    // non-lean goal ranges：以前只有 lean 分支重算，其他目标选了等于没生效。',
    '    if (goal !== \'lean\') {',
    '      const years = number(state && state.profile ? state.profile.trainingYears : null);',
    '      const gap = goal === \'gain\' ? -surplusForYears(years) : preset.deficitPercent;',
    '      const centre = Math.round(tdee * (1 - Math.min(gap, cap) / 100));',
    '      trainingDay = {min: Math.max(floor, Math.round(centre * 0.98)), max: Math.max(floor, Math.round(centre * 1.04))};',
    '      restDay = {min: Math.max(floor, Math.round(centre * 0.95)), max: Math.max(floor, Math.round(centre * 1.01))};',
    '      const band = proteinBandFor(goal, gap);',
    '      proteinPerKgMin = Math.max(rules.proteinPerKgMin, band.min);',
    '      proteinPerKgMax = Math.max(rules.proteinPerKgMax, band.max);',
    '    }',
    ''
  ].join('\n');
  t = t.slice(0, lineStart) + branch + t.slice(lineStart);
  n++; console.log('ok non-lean ranges');
}

fs.writeFileSync(f, t);
console.log('changes:', n);
