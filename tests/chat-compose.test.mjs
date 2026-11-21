/**
 * Chat composer density: one question block, a single horizontal row of suggested
 * questions, and a compact right-aligned send action. No second billing tag bar.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

check('the duplicate billing tag is not shown as a bar', css.includes('#view-chat .card-heading--chat{display:none}'));
check('suggested questions use one horizontal strip', css.includes('#view-chat #chat-chips{display:flex;flex-wrap:nowrap;gap:8px;overflow-x:auto'));
check('the strip starts at the first question, not a clipped middle', fs.readFileSync('app/src/main/assets/app.js', 'utf8').includes('row.scrollLeft = 0;'));
check('the question box is shorter than the old three-row block', css.includes('#view-chat #chat-question{height:84px;min-height:84px'));
check('one rounded composer holds the question, attachments and send', html.includes('class="chat-composer" id="chat-composer"') && html.includes('class="chat-composer-tools"') && html.indexOf('id="chat-composer"') < html.indexOf('id="chat-send"'));
check('the send action is inside the composer, not a bottom-right bar', html.includes('class="chat-send-button" id="chat-send"') && !html.includes('class="chat-send-bar"'));
check('the composer still has one send button', (html.match(/id="chat-send"/g) || []).length === 1);
check('the history card is not covered by a fixed composer', !/#view-chat \.chat-composer\{position:fixed/.test(css));
check('tab focus does not paint a page-sized ring', css.includes('#main:focus-visible{outline:none}'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
