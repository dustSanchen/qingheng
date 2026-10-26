import fs from 'node:fs';

const f = 'app/src/fragments/10-rich-answer.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const from = "for (const id of ['training-log', 'training-advice', 'training-volume-card']) {";
const to = "for (const id of ['training-log', 'training-advice', 'training-volume-card', 'week-plan-card', 'training-advice-order']) {";
if (!t.includes(from)) { console.log('MISS hide list'); process.exit(1); }
t = t.replace(from, to);

// 关闭时把停留在「训练」段/面板的视图拨回去，避免出现空白段
const anchor = 'function applyTrainingVisibility() {';
if (!t.slice(t.indexOf(anchor), t.indexOf(anchor) + 900).includes('switchRecordPanel')) console.log('note: no explicit panel reset found');
fs.writeFileSync(f, t);
console.log('hide list extended');

// 同步更新训练禁用时的视图回退
const f2 = 'app/src/fragments/50-onboarding.fragment.js';
let t2 = fs.readFileSync(f2, 'utf8');
if (!t2.includes('training-off-fallback')) {
  const anchor2 = "button.classList.toggle('active', active); if (button.dataset.trendsPanel === 'training') button.hidden = !trainingEnabled();";
  if (t2.includes(anchor2)) {
    t2 = t2.replace(anchor2, anchor2 + " if (!trainingEnabled() && active && panel === 'training') { /* training-off-fallback */ }");
  }
  fs.writeFileSync(f2, t2);
}
