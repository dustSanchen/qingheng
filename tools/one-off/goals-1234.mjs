import fs from 'node:fs';

const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');
let n = 0;

// ── #2 蛋白按缺口幅度分档（ISSN 2017：缺口越大越靠上限）
if (!t.includes('function proteinBandFor(')) {
  const anchor = 'const RULE_KEYS = Object.keys(TARGET_RULES);';
  if (!t.includes(anchor)) throw new Error('RULE_KEYS anchor missing');
  const helper = [
    'const RULE_KEYS = Object.keys(TARGET_RULES);',
    '',
    '  /**',
    '   * 蛋白区间按「缺口幅度」分档（ISSN 2017：热量缺口期 2.3~3.1 g/kg，缺口越大越靠上限）。',
    '   * 维持目标不套用减脂档，沿用 1.6~2.0（ISSN 下限 1.4 已足够）。',
    '   */',
    '  function proteinBandFor(goal, deficitPercent) {',
    '    if (goal === \'maintain\') return {min: 1.6, max: 2.0};',
    '    const gap = Math.abs(Number(deficitPercent) || 0);',
    '    if (gap < 10) return {min: 2.0, max: 2.2};',
    '    if (gap <= 20) return {min: 2.3, max: 2.5};',
    '    return {min: 2.5, max: 2.8};',
    '  }',
    '',
    '  /** 增肌盈余按训练年限分级：#4 */',
    '  function surplusForYears(years) {',
    '    const y = Number(years);',
    '    if (!Number.isFinite(y) || y <= 0) return 8;',
    '    if (y < 1) return 10;',
    '    if (y <= 3) return 8;',
    '    return 5;',
    '  }'
  ].join('\n');
  t = t.replace(anchor, helper);
  n++; console.log('ok proteinBandFor + surplusForYears');
}

// ── #1 非薄肌目标也按各自缺口/盈余算区间
if (!t.includes('non-lean goal ranges')) {
  const marker = 'const proteinMin = Math.round(w * proteinPerKgMin);';
  if (!t.includes(marker)) throw new Error('proteinMin marker missing');
  const elseBranch = [
    '// non-lean goal ranges：以前只有 lean 分支重算区间，其他目标等于没生效。',
    '    if (goal !== \'lean\') {',
    '      const gap = goal === \'gain\' ? -surplusForYears(profileYears) : preset.deficitPercent;',
    '      const centre = Math.round(tdee * (1 - Math.min(gap, cap) / 100));',
    '      trainingDay = {min: Math.max(floor, Math.round(centre * 0.98)), max: Math.max(floor, Math.round(centre * 1.04))};',
    '      restDay = {min: Math.max(floor, Math.round(centre * 0.95)), max: Math.max(floor, Math.round(centre * 1.01))};',
    '      const band = proteinBandFor(goal, gap);',
    '      proteinPerKgMin = Math.max(rules.proteinPerKgMin, band.min);',
    '      proteinPerKgMax = Math.max(rules.proteinPerKgMax, band.max);',
    '    }',
    ''
  ].join('\n');
  t = t.replace(marker, elseBranch + marker);
  n++; console.log('ok non-lean ranges');
}

// profileYears 变量
if (!t.includes('const profileYears =')) {
  const anchor2 = "const preset = GOAL_PRESETS[goal] || GOAL_PRESETS.recomp;";
  if (t.includes(anchor2)) {
    t = t.replace(anchor2, anchor2 + '\n    const profileYears = number(state && state.profile ? state.profile.trainingYears : null);');
    n++; console.log('ok profileYears');
  }
}

fs.writeFileSync(f, t);
console.log('changes:', n);
