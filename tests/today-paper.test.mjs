/**
 * Today's paper/ledger language: a ruled sheet, a margin line, one paper hero,
 * and a two-row next-step note with an explicit reason.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('paper skin has ruled grain and a margin rule', css.includes('[data-skin="paper"] #view-today{position:relative;background-image:repeating-linear-gradient') && css.includes('[data-skin="paper"] #view-today::before'));
check('the today header has a paper divider', css.includes('.page-heading--today{border-bottom:1px solid var(--line)'));
check('today energy is one paper hero card', css.includes('#view-today .energy-card{background:var(--surface);border:1px solid var(--line);border-radius:20px'));
check('ledger keeps its square ledger frame', css.includes('[data-skin="ledger"] #view-today .energy-card{border-radius:0'));
check('the action line is a single 48px row', css.includes('.today-action{display:flex;align-items:center;gap:8px;min-height:48px'));
check('no second action surface is left', !html.includes('id="slot-note"') && !html.includes('id="slot-hint"'));
check('the sleep jump is a single direct link to the existing body field', app.includes('data-focus="habit-sleep"') && app.includes('revealField(button.dataset.focus)'));
check('the reason moved into the sheet', !html.includes('id="slot-reason"') && app.includes('function openDayBrief()'));
check('an empty day still shows a calm line', app.includes('今天没有要补的缺口，按计划走就好'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
