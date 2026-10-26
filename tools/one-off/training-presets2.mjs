/**
 * 修正版：上一版在补丁脚本里用了未转义的 ${index}，导致脚本自身报错。
 * 这里把含 $ 的源码片段用转义写法处理。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

const addBlock = [
  "$('#training-add')?.addEventListener('click', () => {",
  "  const box = $('#training-exercises');",
  "  const index = box.querySelectorAll('[data-exercise-row]').length;",
  "  if (index >= 12) {notice('一次最多记录 12 个动作。', true); return;}",
  "  const row = document.createElement('div');",
  "  row.className = 'training-row';",
  '  row.dataset.exerciseRow = String(index);',
  "  row.innerHTML = '<label>动作<input data-exercise=\"name\" maxlength=\"60\" placeholder=\"例如 深蹲\"></label><div class=\"form-grid\"><label>组数<input data-exercise=\"sets\" type=\"number\" min=\"0\" max=\"30\" step=\"1\"></label><label>每组次数<input data-exercise=\"reps\" type=\"number\" min=\"0\" max=\"200\" step=\"1\"></label><label>负重 · kg<input data-exercise=\"weight\" type=\"number\" min=\"0\" max=\"500\" step=\"0.5\"></label></div><div class=\"row-meta\"><span>容量 —</span><button type=\"button\" class=\"icon-button danger\" data-exercise-remove=\"${index}\" aria-label=\"移除这个动作\">×</button></div>';",
  "  box.append(row);",
  '  });',
].join('\n');

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'add button delegates to the shared builder',
    addBlock,
    "$('#training-add')?.addEventListener('click', () => {appendExerciseRow('', null);});",
  ],
  [
    'preset chips',
    "$('#training-exercises')?.addEventListener('click', event => {",
    `$('#training-presets')?.addEventListener('click', event => {
    const chip = event.target.closest('[data-training-preset]');
    if (!chip) return;
    const name = chip.textContent.trim();
    const previous = latestExerciseValues(name);
    const row = appendExerciseRow(name, previous);
    if (!row) return;
    if (previous) {
      notice(\`已添加 \${name}：沿用 \${previous.date} 的 \${previous.sets}×\${previous.reps}×\${previous.weight} kg，可修改。\`);
      const weight = $('[data-exercise="weight"]', row);
      if (weight) weight.focus();
    } else {
      notice(\`已添加 \${name}，填写组数、次数与负重后保存。\`);
      const sets = $('[data-exercise="sets"]', row);
      if (sets) sets.focus();
    }
  });
  $('#training-template')?.addEventListener('change', () => renderTrainingPresets());
  $('#training-exercises')?.addEventListener('click', event => {`,
  ],
]);

// 50-onboarding 的三处新增（HTML 里的按钮不需要重复打）
patch('app/src/fragments/50-onboarding.fragment.js', [
  [
    'presets per body part',
    `  function renderTrainingLog() {`,
    `  /** Common lifts per template, ordered the way most people train them. */
  const EXERCISE_PRESETS = {
    push: ['卧推', '上斜哑铃卧推', '哑铃肩推', '侧平举', '绳索下压', '双杠臂屈伸'],
    pull: ['引体向上', '杠铃划船', '高位下拉', '面拉', '哑铃弯举', '直臂下压'],
    legs: ['深蹲', '硬拉', '腿举', '保加利亚分腿蹲', '罗马尼亚硬拉', '提踵', '卷腹', '平板支撑'],
    other: ['农夫行走', '壶铃摇摆', '有氧 20 分钟', '拉伸 10 分钟']
  };
  /** The most recent recorded values for one exercise, so a repeat is one tap instead of retyping. */
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
  /** Adds one exercise row; used by the 添加动作 button and by the preset chips. */
  function appendExerciseRow(name, values) {
    const box = $('#training-exercises');
    if (!box) return null;
    const index = box.querySelectorAll('[data-exercise-row]').length;
    if (index >= 12) {notice('一次最多记录 12 个动作。', true); return null;}
    const row = document.createElement('div');
    row.className = 'training-row';
    row.dataset.exerciseRow = String(index);
    const sets = values && values.sets !== null && values.sets !== undefined ? \` value="\${Number(values.sets)}"\` : '';
    const reps = values && values.reps !== null && values.reps !== undefined ? \` value="\${Number(values.reps)}"\` : '';
    const weight = values && values.weight !== null && values.weight !== undefined ? \` value="\${Number(values.weight)}"\` : '';
    row.innerHTML = \`<label>动作<input data-exercise="name" maxlength="60" placeholder="例如 深蹲" value="\${esc(name || '')}"></label><div class="form-grid"><label>组数<input data-exercise="sets" type="number" min="0" max="30" step="1"\${sets}></label><label>每组次数<input data-exercise="reps" type="number" min="0" max="200" step="1"\${reps}></label><label>负重 · kg<input data-exercise="weight" type="number" min="0" max="500" step="0.5"\${weight}></label></div><div class="row-meta"><span>容量 —</span><button type="button" class="icon-button danger" data-exercise-remove="\${index}" aria-label="移除这个动作">×</button></div>\`;
    box.append(row);
    return row;
  }
  /** Chips for the currently selected template. */
  function renderTrainingPresets() {
    const box = $('#training-presets'), form = $('#training-form');
    if (!box || !form) return;
    const template = TRAINING_TEMPLATES[form.elements.template.value] ? form.elements.template.value : 'push';
    const presets = EXERCISE_PRESETS[template] || [];
    box.innerHTML = presets.map((name, index) => \`<button type="button" class="button subtle" data-training-preset="\${index}">\${esc(name)}</button>\`).join('');
    box.dataset.template = template;
  }
  function renderTrainingLog() {`,
  ],
  [
    'render the chips with the log',
    `    const tag = $('#training-tag');`,
    `    renderTrainingPresets();
    const tag = $('#training-tag');`,
  ],
]);

console.log('training presets wired (v2)');
