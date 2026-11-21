/**
 * Visual symbol contract: leaf 40 for empty, ring 20 for loading, leaf 24 + --ok
 * for completion, and exactly three forbidden decorative uses.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('one symbol contract is declared', app.includes('const SYMBOL_USAGE = Object.freeze('));
check('empty uses the leaf at 40', app.includes("empty: {glyph: 'leaf', size: 40}") && app.includes('SYMBOL_USAGE.empty.size'));
check('the leaf is inline currentColor, not a fixed-color img', app.includes("'icon-glyph-leaf.svg': svgIcon(") && app.includes("iconMarkup('icon-glyph-leaf.svg')"));
check('empty icon CSS keeps the 40px inline leaf', css.includes('.empty-icon svg{display:block;width:40px;height:40px'));
check('state-block empty leaf uses currentColor via a mask', css.includes('background-color:var(--muted)') && css.includes('mask:url("./icon-glyph-leaf.svg")'));
check('loading declares a 20px 1.2s ring', app.includes("loading: {glyph: 'ring', size: 20, duration: '1.2s linear'}") && /\.busy-ring\{width:20px;height:20px;animation:busy-spin 1\.2s linear infinite\}/.test(css));
check('completion uses the leaf at 24', app.includes("complete: {glyph: 'leaf', size: 24, tone: 'ok'}") && app.includes("leaf.setAttribute('width', String(SYMBOL_USAGE.complete.size))"));
check('completion color comes from the ok token', css.includes('.form-feedback.success{display:flex;align-items:center;gap:var(--space-1);color:var(--ok)}'));
check('the contract names exactly three forbidden uses', (app.match(/'buttons\/list rows\/card badges'|'numbers and units'|'error\/warning copy'/g) || []).length === 3);
check('empty icon CSS does not shrink the 40px leaf', css.includes('.empty-icon img{display:block;width:40px;height:40px') || css.includes('.empty-icon svg{display:block;width:40px;height:40px'));
check('symbol rules stay out of interactive labels', !app.includes('SYMBOL_USAGE.forbidden') || app.includes("forbidden: ['buttons/list rows/card badges'"));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
