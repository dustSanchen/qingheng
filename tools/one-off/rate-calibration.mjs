import fs from 'node:fs';

// #3 速率校准：用近 14 天体重变化对比目标速率，给出「建议调整缺口」的提示（不静默改）
const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');

if (!t.includes('function rateCalibration(')) {
  const anchor = 'function goalLabel(goal) {';
  if (!t.includes(anchor)) { console.log('goalLabel anchor missing'); process.exit(1); }
  const helper = [
    'function rateCalibration(goal) {',
    '    // 目标速率：减脂 0.4~0.7%/周、增肌 0.25~0.5%/周、维持 ±0.2%/周（知识库：可持续区间）',
    '    const want = goal === \'gain\' ? {min: 0.25, max: 0.5} : (goal === \'maintain\' ? {min: -0.2, max: 0.2} : {min: 0.4, max: 0.7});',
    '    const weights = (Array.isArray(state && state.habits) ? state.habits : [])',
    '      .filter(row => row && /^\\d{4}-\\d{2}-\\d{2}$/.test(String(row.date)) && Number(row.weight) > 0)',
    '      .sort((a, b) => String(a.date).localeCompare(String(b.date)));',
    '    if (weights.length < 2) return null;',
    '    const last = weights[weights.length - 1];',
    '    const cutoff = shiftDay(last.date, -14);',
    '    const window = weights.filter(row => String(row.date) >= cutoff);',
    '    if (window.length < 2) return null;',
    '    const first = window[0], base = Number(first.weight), now = Number(last.weight);',
    '    if (!(base > 0)) return null;',
    '    const days = Math.max(1, Math.round((new Date(last.date + "T00:00:00") - new Date(first.date + "T00:00:00")) / 86400000));',
    '    const weeklyPercent = Math.round(((now - base) / base) * (7 / days) * 1000) / 10;',
    '    const loss = -weeklyPercent;',
    '    if (goal === \'gain\') {',
    '      if (weeklyPercent < want.min) return {text: "近 " + days + " 天体重每周变化 " + weeklyPercent + "%，低于增肌区间 " + want.min + "~" + want.max + "%，可考虑把盈余上调约 3%。"};',
    '      if (weeklyPercent > want.max) return {text: "近 " + days + " 天每周涨 " + weeklyPercent + "%，高于增肌区间，建议把盈余下调约 3%。"};',
    '      return {text: "增肌速率 " + weeklyPercent + "%/周，在 " + want.min + "~" + want.max + "% 区间内。"};',
    '    }',
    '    if (goal === \'maintain\') return {text: "近 " + days + " 天体重每周变化 " + weeklyPercent + "%，维持目标看趋势不看单点。"};',
    '    if (loss < want.min) return {text: "近 " + days + " 天每周降 " + loss + "%，低于 " + want.min + "~" + want.max + "% 区间，可考虑把缺口上调约 3%。"};',
    '    if (loss > want.max) return {text: "近 " + days + " 天每周降 " + loss + "%，高于 " + want.max + "%，建议把缺口下调约 3%，别掉肌肉。"};',
    '    return {text: "减脂速率 " + loss + "%/周，落在 " + want.min + "~" + want.max + "% 的可持续区间内。"};',
    '  }',
    '  '
  ].join('\n');
  t = t.replace(anchor, helper + anchor);
  console.log('rateCalibration added');
}

fs.writeFileSync(f, t);
