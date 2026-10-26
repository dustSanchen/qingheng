/**
 * v3：只用小锚点，避免整段匹配失败。
 *  - 预设与行构造放在 50-onboarding（与 renderTrainingLog 同作用域）；
 *  - 70-rest 只在既有事件监听前插入 chip 处理，不改原「添加动作」实现。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/main/assets/index.html', [
  [
    'preset chips container',
    `<div id="training-exercises" class="list-stack"></div>`,
    `<div class="button-row" id="training-presets" aria-label="常见动作，点一下添加"></div><div id="training-exercises" class="list-stack"></div>`,
  ],
]);

patch('app/src/fragments/50-onboarding.fragment.js', [
  [
    'presets, last values and a shared row builder',
    `  function renderTrainingLog() {`,
    `  /** Common lifts per template, ordered the way most people train them. */
  const EXERCISE_PRESETS = {
    push: ['卧推', '上斜哑铃卧推', '哑铃肩推', '侧平举', '绳索下压', '双杠臂屈伸'],
    pull: ['引体向上', '杠铃划船', '高位下拉', '面拉', '哑铃弯举', '直臂下压'],
    legs: ['深蹲', '硬拉', '腿举', '保加利亚分腿蹲', '罗马尼亚硬拉', '提踵', '卷腹', '平板支撑'],
    other: ['农夫行走', '壶铃摇摆', '有氧 20 分钟', '拉伸 10 分钟']
  };
  /** Most recent recorded values for one exercise, so a repeat is one tap instead of retyping. */
  function latestExerciseValues(name) {
    const wanted = String(name || '').trim();
    if (!wanted) return null;
    const rows = (state.habits || []).filter(row => row && Array.isArray(row.exercises) && validDate(row.date))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    for (const row of rows) {
      for (const item of row.exercises) {
        if (!item || String(item.name || '').trim() !== wanted) continue;
        const sets = number(item.sets), reps = number(item.reps), weight = number(item.weight);
        if (sets === null || reps === null || weight === null) continue;
        return {sets, reps, weight, date: row.date};
      }
    }
    return null;
  }
  /** Adds one exercise row, optionally pre-filled; shared by the 添加动作 button and the preset chips. */
  function appendExerciseRow(name, values) {
    const box = $('#training-exercises');
    if (!box) return null;
    const index = box.querySelectorAll('[data-exercise-row]').length;
    if (index >= 12) {notice('一次最多记录 12 个动作。', true); return null;}
    const row = document.createElement('div');
    row.className = 'training-row';
    row.dataset.exerciseRow = String(index);
    const attr = value => value === null || value === undefined ? '' : \` value="\${Number(value)}"\`;
    row.innerHTML = \`<label>动作<input data-exercise="name" maxlength="60" placeholder="例如 深蹲" value="\${esc(name || '')}"></label><div class="form-grid"><label>组数<input data-exercise="sets" type="number" min="0" max="30" step="1"\${attr(values && values.sets)}></label><label>每组次数<input data-exercise="reps" type="number" min="0" max="200" step="1"\${attr(values && values.reps)}></label><label>负重 · kg<input data-exercise="weight" type="number" min="0" max="500" step="0.5"\${attr(values && values.weight)}></label></div><div class="row-meta"><span>容量 —</span><button type="button" class="icon-button danger" data-exercise-remove="\${index}" aria-label="移除这个动作">×</button></div>\`;
    box.append(row);
    return row;
  }
  /** Chips for the selected template. */
  function renderTrainingPresets() {
    const box = $('#training-presets'), form = $('#training-form');
    if (!box || !form) return;
    const template = TRAINING_TEMPLATES[form.elements.template.value] ? form.elements.template.value : 'push';
    box.innerHTML = (EXERCISE_PRESETS[template] || []).map(name => \`<button type="button" class="button subtle" data-training-preset="\${esc(name)}">\${esc(name)}</button>\`).join('');
    box.dataset.template = template;
  }
  function renderTrainingLog() {`,
  ],
  [
    'chips follow the log',
    `    const tag = $('#training-tag');`,
    `    renderTrainingPresets();
    const tag = $('#training-tag');`,
  ],
]);

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'chip click adds a row with the last values',
    `  $('#training-exercises')?.addEventListener('click', event => {`,
    `  $('#training-presets')?.addEventListener('click', event => {
    const chip = event.target.closest('[data-training-preset]');
    if (!chip) return;
    const name = chip.dataset.trainingPreset;
    const previous = latestExerciseValues(name);
    const row = appendExerciseRow(name, previous);
    if (!row) return;
    notice(previous
      ? \`已添加 \${name}：沿用 \${previous.date} 的 \${previous.sets}×\${previous.reps}×\${previous.weight} kg，可修改。\`
      : \`已添加 \${name}，填写组数、次数与负重后保存。\`);
    $('[data-exercise="sets"]', row)?.focus();
  });
  $('#training-template')?.addEventListener('change', () => renderTrainingPresets());
  $('#training-exercises')?.addEventListener('click', event => {`,
  ],
]);

console.log('training presets wired (v3)');
