import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

// 计划卡里常驻一块「整理图参考处方」：有历史时也不覆盖，只作对照
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['a reference block with the digest prescriptions',
   `    const suggestedNote = plan.days.some(day => day.suggested) ?`,
   `    const reference = (() => {
      const lib = trainingLibrary();
      if (!lib || !lib.dayTemplates) return '';
      const names = ['push', 'pull', 'legs'];
      const rows = names.map(key => {
        const day = lib.dayTemplates[key];
        if (!day || !day.exercises) return '';
        const list = day.exercises.map(item => esc(item.name) + ' ' + item.sets + '×' + item.reps + (item.rpe ? ' RPE' + item.rpe : '')).join(' · ');
        return '<p><strong>' + esc(day.label) + '</strong><br>' + list + '</p>';
      }).join('');
      return rows ? '<details class="plan-ref"><summary>整理图参考处方</summary>' + rows
        + '<p class="fine-print">来自评论区「课代表」按三分化视频整理的图片（C 级，与视频结构互证）。</p></details>' : '';
    })();
    const suggestedNote = plan.days.some(day => day.suggested) ?`],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  ['render the reference block',
   "      + '<p class=\"fine-print\">' + esc(plan.note) + '</p>' + suggestedNote + why",
   "      + '<p class=\"fine-print\">' + esc(plan.note) + '</p>' + suggestedNote + why + reference"],
]);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.plan-ref{')) {
  css += `
/* Reference prescriptions from the community digest: collapsed, never overrides real history. */
.plan-ref{margin:8px 0 0;border-top:1px dashed var(--line);padding-top:8px}
.plan-ref summary{cursor:pointer;font-size:12.5px;color:var(--muted)}
.plan-ref p{margin:8px 0;font-size:12px;line-height:1.6;color:var(--ink)}
.plan-ref p strong{font-size:12.5px}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  plan-ref styles');
}

let test = fs.readFileSync('tests/training-library.test.mjs', 'utf8');
if (!test.includes('整理图参考处方')) {
  test = test.replace("console.log('\\nFAIL total: ' + fail);",
    "check('the card shows the reference prescriptions', app.includes('整理图参考处方') && app.includes('plan.days.some(day => day.suggested)'));\nconsole.log('\\nFAIL total: ' + fail);");
  fs.writeFileSync('tests/training-library.test.mjs', test);
  console.log('ok  reference assertions');
}

console.log('reference block wired');
