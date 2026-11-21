/**
 * Paper language is shared across pages: same ruled sheet and margin rule, with
 * one hero card per records/trends panel. Ledger keeps its square frame.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('records/trends/profile share the ruled paper sheet', css.includes('[data-skin="paper"] #view-records,[data-skin="paper"] #view-trends,[data-skin="paper"] #view-profile{position:relative;background-image:repeating-linear-gradient'));
check('paper pages do not run a continuous margin line through cards', css.includes('[data-skin="paper"] #view-profile::before{display:none}') && !css.includes('background:rgba(138,82,55'));
check('all paper pages share the header divider', css.includes('[data-skin="paper"] .page-heading{border-bottom:1px solid var(--line)'));
check('records/training/body first card is a paper hero', css.includes('[data-skin="paper"] #view-records .record-panel:not([hidden]) .card:first-of-type'));
check('trends chart is a paper hero', css.includes('[data-skin="paper"] #view-trends .card:first-of-type{background:var(--surface)'));
check('hero headings use the display serif', css.includes('.record-panel:not([hidden]) .card:first-of-type .card-heading h2'));
check('ledger keeps its own divider, not paper texture', css.includes('[data-skin="ledger"] .page-heading{border-bottom:1px solid var(--line)') && !css.includes('[data-skin="ledger"] #view-records::before'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
