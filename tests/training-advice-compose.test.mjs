/**
 * Training advice uses the same one-surface composer as chat, with the send
 * action inside the input instead of a full-width button below it.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

check('training advice keeps its form and textarea ids', html.includes('id="training-advice-form"') && html.includes('id="training-advice-input"'));
check('training advice uses a rounded composer', html.includes('id="training-advice-composer"') && html.includes('class="chat-composer"'));
check('the send action sits inside the composer', html.includes('class="chat-send-button" aria-label="发送训练问题"'));
check('the old full-width ask button is gone', !html.includes('>问训练建议</button>'));
check('quick prompts use one horizontal strip like chat', css.includes('#training-advice #training-advice-chips{display:flex;flex-wrap:nowrap'));
check('the composer input is visually de-boxed', css.includes('#view-chat #training-advice-input{height:76px'));
check('the existing submit handler still owns the form', app.includes("$('#training-advice-form')") || app.includes('training-advice-form'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
