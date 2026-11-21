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
check('the next step is a two-row grid', css.includes('#view-today .slot-hint.is-next{display:grid;grid-template-columns:auto 1fr'));
check('the next step carries a reason line', html.includes('id="slot-reason"') && app.includes('reasonNode.textContent = primary && primary.reason'));
check('the reason is hidden when there is no primary', app.includes('reasonNode.hidden = !(primary && primary.reason)'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
