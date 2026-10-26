/**
 * P1-6 薄肌阶段复盘自动化：记录阶段起点、显示第几周、满 8 周时提示复盘并换阶段。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/40-targets.fragment.js', [
  [
    'phase counter',
    `  /** Writes computed targets back into the profile form and reports the basis. */`,
    `  /**
   * 薄肌 is an 8~12 week block, not a permanent setting. The start date is stamped when the goal is
   * saved, and the plan says which week it is and when to review.
   */
  function leanPhase(goal, startedAt) {
    if (goal !== 'lean') return null;
    const start = validDate(String(startedAt || '')) ? String(startedAt) : '';
    if (!start) return {weeks: 0, start: null, due: false, text: '薄肌是 8~12 周一个阶段：保存档案后开始计时。'};
    const days = Math.max(0, Math.round((Date.parse(localDate()) - Date.parse(start)) / 86400000));
    const weeks = Math.floor(days / 7) + 1;
    return {
      weeks, start, due: weeks >= 8,
      text: weeks >= 8
        ? \`薄肌阶段第 \${weeks} 周（起点 \${start}），已满 8 周：用实测维持热量重算，并考虑安排 1~2 周维持或换阶段\`
        : \`薄肌阶段第 \${weeks} 周（起点 \${start}），第 8~12 周复盘\`
    };
  }
  /** Writes computed targets back into the profile form and reports the basis. */`,
  ],
  [
    'show the phase in the plan',
    `    status.textContent = ['已按「' + (GOAL_LABEL[result.goal] || '增肌同时减脂') + '」与你的口径测算：']
      .concat(result.lines)
      .concat([calibrationLine])`,
    `    const phase = leanPhase(result.goal, state.profile && state.profile.leanPhaseStartedAt);
    status.textContent = ['已按「' + (GOAL_LABEL[result.goal] || '增肌同时减脂') + '」与你的口径测算：']
      .concat(result.lines)
      .concat(phase ? [phase.text] : [])
      .concat([calibrationLine])`,
  ],
  [
    'stamp the phase start on save',
    `    const payload = {
      sex: form.elements.sex.value,
      height: number(form.elements.height.value),
      age: number(form.elements.age.value),
      goal: form.elements.goal.value || 'recomp',
      training,`,
    `    const goal = form.elements.goal.value || 'recomp';
    const payload = {
      sex: form.elements.sex.value,
      height: number(form.elements.height.value),
      age: number(form.elements.age.value),
      goal,
      // Stamping the start date here is what makes the 8~12 week review possible at all.
      ...(goal === 'lean' && !(state.profile && state.profile.leanPhaseStartedAt) ? {leanPhaseStartedAt: localDate()} : {}),
      training,`,
  ],
]);

console.log('P1-6 wired');
