/**
 * Training hierarchy: the decision line comes first; AI is a secondary text action;
 * the week strip is context, not a second hero.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('the training decision line is a 20px layer', css.includes('#training-advice-order .plan-sub{font-size:20px'));
check('the week strip heading is reduced to meta', css.includes('#week-plan .plan-sub{font-size:var(--text-xs)'));
check('today detail is an 18px focal line', css.includes('#week-detail{font-size:18px'));
check('the advice page no longer offers a second AI action', !app.includes('改用 AI 排今天'));
check('the primary adopt action remains', app.includes('data-today-adopt') && app.includes('采纳到今日清单'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
