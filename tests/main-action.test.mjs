/**
 * Main-action contract for the chat page: reuse the existing send bar, fix it above
 * the tab bar on phones, keep one primary button, and reserve content space.
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

check('the existing chat send button is the main action', /id="chat-send"/.test(html) && /class="chat-composer"/.test(html));
check('the composer stays in the input card instead of covering history', !/#view-chat \.chat-composer\{position:fixed/.test(css) && css.includes('#view-chat .chat-composer{display:flex'));
check('focus scrolls the composer into view after the keyboard settles', app.includes('installChatFocusReveal') && app.includes("bar.scrollIntoView({block: 'nearest', behavior: 'smooth'})"));
check('photo entry points sit inside the composer', html.includes('class="chat-attach"') && html.indexOf('class="chat-attach"') < html.indexOf('id="chat-send"'));
check('record form primary stays in flow and cannot cover body fields', !css.includes('#view-records .record-panel:not([hidden]) form>.button.primary[type=submit]'));
check('there is only one chat send button', (html.match(/id="chat-send"/g) || []).length === 1);
check('no second action-bar copy is added', !/id="action-bar"/.test(html));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
