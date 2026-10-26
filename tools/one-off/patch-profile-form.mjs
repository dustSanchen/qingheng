/*
 * One-off patch: give the profile form a training-frequency field and the 口径 (rules) fields that
 * computeTargets now derives every number from. Fails loudly if an anchor is missing or ambiguous.
 */
import fs from 'node:fs';

const file = 'app/src/main/assets/index.html';
let html = fs.readFileSync(file, 'utf8');
const before = html.length;

function replaceOnce(source, from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly 1 anchor, found ${count}`);
  return source.replace(from, to);
}

const weightLabel = '<label>最近体重 · kg<input name="weight" type="number" min="20" max="400" step="0.1" placeholder="用于测算，可留空"></label>';
const trainingLabel = '<label>每周力量训练次数<select name="training"><option value="">未填（不猜）</option><option value="1">0~1 次（久坐）</option><option value="3">2~3 次</option><option value="5">4~5 次</option><option value="6">6 次以上</option></select></label>';
html = replaceOnce(html, weightLabel, weightLabel + trainingLabel, 'training field');

const oldAdvanced = '<details class="advanced"><summary>手动调整目标数值</summary><div class="form-grid"><label>每日热量目标 · kcal<input name="calorieTarget" type="number" min="1" max="10000" step="1"></label><label>参考热量 · kcal<input name="referenceCalories" type="number" min="1" max="10000" step="1" placeholder="维持热量"></label><label>蛋白质下限 · g<input name="proteinMin" type="number" min="0" max="1000" step="0.1"></label><label>蛋白质上限 · g<input name="proteinMax" type="number" min="0" max="1000" step="0.1"></label><label>脂肪下限 · g<input name="fatMin" type="number" min="0" max="1000" step="0.1"></label><label>脂肪上限 · g<input name="fatMax" type="number" min="0" max="1000" step="0.1"></label></div></details>';

const rule = (name, label, min, max, step, placeholder) =>
  `<label>${label}<input name="${name}" type="number" min="${min}" max="${max}" step="${step}" placeholder="${placeholder}"></label>`;

const newAdvanced = '<details class="advanced"><summary>口径与手动调整</summary>'
  + '<div class="form-grid">'
  + '<label>每日热量目标 · kcal<input name="calorieTarget" type="number" min="1" max="10000" step="1"></label>'
  + '<label>参考热量（维持）· kcal<input name="referenceCalories" type="number" min="1" max="10000" step="1" placeholder="维持热量"></label>'
  + '<label>蛋白质下限 · g<input name="proteinMin" type="number" min="0" max="1000" step="0.1"></label>'
  + '<label>蛋白质上限 · g<input name="proteinMax" type="number" min="0" max="1000" step="0.1"></label>'
  + '<label>脂肪下限 · g<input name="fatMin" type="number" min="0" max="1000" step="0.1"></label>'
  + '<label>脂肪上限 · g<input name="fatMax" type="number" min="0" max="1000" step="0.1"></label>'
  + '</div>'
  + '<p class="muted">下面这组阈值就是测算口径，默认与执行规则一致；改动会一起保存，并在每次测算时参与校验。</p>'
  + '<div class="form-grid">'
  + rule('intakeFloor', '日摄入硬底线 · kcal', 800, 6000, 10, '2000')
  + rule('deficitCapPercent', '缺口上限 · % 维持热量', 0, 40, 1, '20')
  + rule('proteinPerKgMin', '蛋白质 · g/kg 下限', 0.8, 4, 0.1, '2.0')
  + rule('proteinPerKgMax', '蛋白质 · g/kg 上限', 0.8, 4, 0.1, '2.2')
  + rule('fatFloorG', '脂肪下限 · g', 20, 200, 1, '50')
  + rule('fatIdealMinG', '脂肪理想下限 · g', 20, 200, 1, '55')
  + rule('fatIdealMaxG', '脂肪理想上限 · g', 20, 250, 1, '70')
  + rule('trainingDayMin', '训练日下限 · kcal', 800, 8000, 10, '2150')
  + rule('trainingDayMax', '训练日上限 · kcal', 800, 8000, 10, '2350')
  + rule('restDayMin', '休息日下限 · kcal', 800, 8000, 10, '2000')
  + rule('restDayMax', '休息日上限 · kcal', 800, 8000, 10, '2150')
  + '</div></details>';

html = replaceOnce(html, oldAdvanced, newAdvanced, 'rules block');
fs.writeFileSync(file, html);

const names = ['training', 'intakeFloor', 'deficitCapPercent', 'proteinPerKgMin', 'proteinPerKgMax', 'fatFloorG', 'fatIdealMinG', 'fatIdealMaxG', 'trainingDayMin', 'trainingDayMax', 'restDayMin', 'restDayMax'];
for (const name of names) {
  const count = html.split(`name="${name}"`).length - 1;
  if (count !== 1) throw new Error(`field ${name}: expected 1, found ${count}`);
}
console.log(`index.html patched: ${before} -> ${html.length} bytes, ${names.length} fields verified`);
