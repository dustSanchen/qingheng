/**
 * P1-5 训练进阶判定，复用已有的 weeklyVolume()（不要重写周一算法）。
 * 输出三条：哪个动作停滞、要换什么动作、本周容量是否该 deload。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'training insights using the existing weekly volume',
    `  /** The 今天-page window: training questions only, with its own consent gate. */`,
    `  /**
   * Three things the log can answer without any model call: which lift stopped moving, what to swap it
   * for, and whether this week's volume is a deload candidate. Reuses weeklyVolume() so the Monday
   * boundary and the volume formula stay in one place.
   */
  function trainingInsights() {
    const rows = typeof weeklyVolume === 'function' ? weeklyVolume() : [];
    const swaps = {'深蹲': '腿举', '卧推': '上斜哑铃卧推', '硬拉': '罗马尼亚硬拉', '划船': '引体向上', '肩推': '侧平举', '腿举': '保加利亚分腿蹲', '推举': '哑铃肩推'};
    const insights = [];
    for (const row of rows) {
      if (!(row.prevVolume > 0) || row.lastVolume > row.prevVolume * 1.02) continue;
      const swap = swaps[row.name];
      insights.push(\`\${row.name} 连续两周没有进步（\${fmt(row.prevVolume,0)} → \${fmt(row.lastVolume,0)} kg 容量）\${swap ? \`，可以换成 \${swap} 练 4~6 周\` : ''}\`);
    }
    let last = 0, prev = 0;
    for (const row of rows) {last += row.lastVolume; prev += row.prevVolume;}
    if (prev > 0 && last > prev * 1.25) insights.push(\`本周总容量比上周高 \${fmt((last / prev - 1) * 100, 0)}%；如果连着两周都这样，下周减量 40% 当 deload\`);
    if (!insights.length) {
      const trained = (state.habits || []).some(row => row && row.date === localDate() && (row.training === true || row.training === 'true'));
      insights.push(trained ? '今天已训练；容量连续两周上升，说明渐进超负荷在生效。' : '今天还没记录训练；练完记一条，下周就能看出哪个动作停了。');
    }
    return insights.slice(0, 3);
  }
  /** Renders those insights into the 今天-page training card. */
  function renderTrainingInsights() {
    const box = $('#training-advice-insights');
    if (!box) return;
    box.innerHTML = trainingInsights().map(text => \`<p class="fine-print">· \${esc(text)}</p>\`).join('');
  }
  /** The 今天-page window: training questions only, with its own consent gate. */`,
  ],
]);

patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'render the training insights with everything else',
    `    renderChat();
    renderTargetStatus();`,
    `    renderChat();
    renderTrainingInsights();
    renderTargetStatus();`,
  ],
]);

console.log('P1-5 wired on top of weeklyVolume');
