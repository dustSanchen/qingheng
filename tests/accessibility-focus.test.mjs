/**
 * P2 accessibility closure: dialogs and sheets must return focus to the trigger.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

check('the confirm dialog remembers its trigger', app.includes('dialogReturnFocus') && app.includes("document.activeElement instanceof HTMLElement"));
check('the confirm dialog returns focus after close', /function closeDialog\(result\)[\s\S]{0,420}returnTo\.focus\(\{preventScroll: true\}\)/.test(app));
check('the action sheet remembers its trigger', app.includes('sheetReturnFocus') && app.includes('function openSheet(config)'));
check('the action sheet focuses its first option', app.includes("first.focus({preventScroll: true})"));
check('the action sheet returns focus after close', /function closeSheet\(result\)[\s\S]{0,320}returnTo\.focus\(\{preventScroll: true\}\)/.test(app));
check('the item recalc dialog remembers its trigger', app.includes('itemRecalcReturnFocus'));
check('the item recalc dialog returns focus after close', /function closeItemRecalc\(\)[\s\S]{0,420}returnTo\.focus\(\{preventScroll: true\}\)/.test(app));
check('the page exposes modal semantics', html.includes('role="dialog"') && html.includes('aria-modal="true"') && html.includes('role="alertdialog"'));
check('the focus styles remain present', app.includes('focus') && html.includes('aria-live="polite"'));
check('focus restoration uses preventScroll instead of jumping the page', app.includes('focus({preventScroll: true})'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
