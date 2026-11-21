/**
 * Cross-page reading flow: records -> trends, trends -> records, and the chat
 * context -> the existing meal field. No new pages, no second write path.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

check('records header leads to the matching trend view', html.includes('data-go="trends"') && html.includes('看趋势'));
check('trends header leads back to records', html.includes('data-go="records"') && html.includes('去记录'));
check('chat context links to the existing meal field, not a new editor', html.includes('id="chat-record-link"') && html.includes('data-go="records" data-focus="meal-text"'));
check('the chat link text follows the selected day count', app.includes("recordLink.textContent=count>0?'查看这一天的记录':'去记录这一天'"));
check('the link uses the existing delegated go handler', app.includes("document.addEventListener('click'") && app.includes('revealField(action.dataset.focus)'));
check('no second records page or duplicate form is introduced', (html.match(/id="view-records"/g) || []).length === 1);
check('the records page still has one primary form per segment', ['id="estimate-form"', 'id="training-form"', 'id="body-quick-form"'].every(id => html.includes(id)));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
