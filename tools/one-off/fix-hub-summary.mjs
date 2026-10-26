/**
 * The hub summary had its own goal map (missing 薄肌) and read the 口径 ranges directly, so 我的 said
 * "未设置目标" and quoted 2,150~2,350 while the plan said 2,000~2,121.
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'hub uses the shared label map and the goal-aware range',
    `    const profile = state.profile || {};
    const goals = {gain:'增肌', cut:'减脂', recomp:'增肌同时减脂', maintain:'保持身材'};
    const targets = $('#hub-summary-targets');
    if (targets) {
      const height = number(profile.height), age = number(profile.age), calorie = number(profile.calorieTarget);
      const training = number(profile.training);
      const rules = targetRules(profile);
      const bits = [
        goals[profile.goal] || '未设置目标',
        height !== null ? \`\${fmt(height,0)} cm\` : '身高未填',
        age !== null ? \`\${fmt(age,0)} 岁\` : '年龄未填',
        training !== null ? \`每周 \${fmt(training,0)} 练\` : '训练次数未填',
        calorie !== null ? \`训练日 \${fmt(rules.trainingDayMin,0)}~\${fmt(rules.trainingDayMax,0)} / 休息日 \${fmt(rules.restDayMin,0)}~\${fmt(rules.restDayMax,0)} kcal\` : '目标未测算'
      ];`,
    `    const profile = state.profile || {};
    const targets = $('#hub-summary-targets');
    if (targets) {
      const height = number(profile.height), age = number(profile.age), calorie = number(profile.calorieTarget);
      const training = number(profile.training);
      // Same source as the 今天 page: a lean plan must not be summarised with the recomp ranges.
      const range = intakeRangeForDate();
      const bits = [
        GOAL_LABEL[profile.goal] || '未设置目标',
        height !== null ? \`\${fmt(height,0)} cm\` : '身高未填',
        age !== null ? \`\${fmt(age,0)} 岁\` : '年龄未填',
        training !== null ? \`每周 \${fmt(training,0)} 练\` : '训练次数未填',
        calorie !== null ? \`训练日 \${fmt(range.trainingDay.min,0)}~\${fmt(range.trainingDay.max,0)} / 休息日 \${fmt(range.restDay.min,0)}~\${fmt(range.restDay.max,0)} kcal\` : '目标未测算'
      ];`,
  ],
]);

const assertions = [
  "check('the hub summary knows the 薄肌 label', read('app/src/fragments/70-rest.fragment.js').includes('GOAL_LABEL[profile.goal]'));",
  "check('the hub summary uses the goal-aware range', read('app/src/fragments/70-rest.fragment.js').includes('const range = intakeRangeForDate();'));",
].join('\n');

patch('tests/lean-targets.test.mjs', [
  [
    'hub summary assertions',
    "console.log('\\nFAIL total: '",
    assertions + "\n\nconsole.log('\\nFAIL total: '",
  ],
]);

console.log('hub summary fixed');
