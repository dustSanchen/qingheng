import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const NL = '\n';

// 1) dailyCheck：区分「未记录」与「不达标」
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['calories idle when nothing was eaten',
   "    items.push({key: 'calories', label: '热量', value: Math.round(sum.calories), target: range.min + '~' + range.max,\n      ok: distance === 0, score: distance === 0 ? 1 : clamp01(1 - distance / width)});",
   "    items.push({key: 'calories', label: '热量', value: Math.round(sum.calories), target: range.min + '~' + range.max,\n      ok: distance === 0, score: distance === 0 ? 1 : clamp01(1 - distance / width),\n      state: sum.calories === 0 ? 'idle' : undefined});"],
  ['protein idle when nothing was eaten',
   "    items.push({key: 'protein', label: '蛋白质', value: Math.round(sum.protein), target: Math.round(src.proteinMin) + 'g 起',\n      ok: sum.protein >= src.proteinMin, score: clamp01(sum.protein / src.proteinMin)});",
   "    items.push({key: 'protein', label: '蛋白质', value: Math.round(sum.protein), target: Math.round(src.proteinMin) + 'g 起',\n      ok: sum.protein >= src.proteinMin, score: clamp01(sum.protein / src.proteinMin),\n      state: sum.calories === 0 ? 'idle' : undefined});"],
  ['fat idle when nothing was eaten',
   "    items.push({key: 'fat', label: '脂肪', value: Math.round(sum.fat), target: Math.round(src.fatMin) + '~' + Math.round(src.fatMax) + 'g',\n      ok: distance === 0, score: distance === 0 ? 1 : clamp01(1 - distance / Math.max(10, src.fatMax))});",
   "    items.push({key: 'fat', label: '脂肪', value: Math.round(sum.fat), target: Math.round(src.fatMin) + '~' + Math.round(src.fatMax) + 'g',\n      ok: distance === 0, score: distance === 0 ? 1 : clamp01(1 - distance / Math.max(10, src.fatMax)),\n      state: sum.calories === 0 ? 'idle' : undefined});"],
  ['training idle when unrecorded',
   "    target: '每天记一次', ok: trained || habit.training === false || habit.training === 'false',\n      score: trained || habit.training === false || habit.training === 'false' ? 1 : 0.4});",
   "    target: '每天记一次', ok: trained || habit.training === false || habit.training === 'false',\n      score: trained || habit.training === false || habit.training === 'false' ? 1 : 0.4,\n      state: trained || habit.training === false || habit.training === 'false' ? undefined : 'idle'});"],
  ['sleep idle when unrecorded',
   "    target: '7 小时起', ok: Number.isFinite(sleep) && sleep >= 7,\n      score: Number.isFinite(sleep) && sleep > 0 ? clamp01(sleep / 7) : 0.4});",
   "    target: '7 小时起', ok: Number.isFinite(sleep) && sleep >= 7,\n      score: Number.isFinite(sleep) && sleep > 0 ? clamp01(sleep / 7) : 0.4,\n      state: Number.isFinite(sleep) && sleep > 0 ? undefined : 'idle'});"],
]);

// 2) 渲染：三态
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['render idle state',
   "<div class=\"check-item ${item.ok ? 'ok' : 'bad'}\">",
   "<div class=\"check-item ${item.state || (item.ok ? 'ok' : 'bad')}\">"],
]);

// 3) 样式：未记录中性，不染红
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.check-item.idle')) {
  css += NL + [
    '/* A metric that has not been recorded yet is neutral, not a failure. */',
    '.check-item.idle{border-color:var(--line);background:var(--surface)}',
    '.check-item.idle .check-dot{background:var(--line);box-shadow:none}',
    '.check-item.idle strong{color:var(--muted)}',
    ''
  ].join(NL);
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  idle styles');
}

console.log('check states wired');
