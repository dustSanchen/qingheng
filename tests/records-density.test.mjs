/**
 * Training/body density: long cue text starts folded, and optional body data does
 * not compete with the daily two-field form on first paint.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

check('the resident cue block is gone', !app.includes('week-cues') && !app.includes('plan-cue-block'));
check('a movement\'s cues open from the ? button instead', app.includes('showExerciseGuide') && app.includes('data-exercise-help') === false);
check('body data is an optional fold', html.includes('id="body-data-fold"') && html.includes('<summary class="card-heading"><h2>身体数据</h2><span class="tag">选填</span></summary>'));
check('the daily two-field form remains first', html.indexOf('id="body-quick"') < html.indexOf('id="body-data-card"'));
check('the fold has an open/close affordance', css.includes(".card-fold>summary::after{content:'展开'") && css.includes(".card-fold[open]>summary::after{content:'收起'}"));
check('revealField still opens an ancestor fold when jumping to a field', app.includes('if (details && !details.open) details.open = true;'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
