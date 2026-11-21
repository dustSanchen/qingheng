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
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

check('the existing chat send bar is the main action', /id="chat-send"/.test(html) && /class="chat-send-bar"/.test(html));
check('the send bar is fixed above the bottom nav on phones', /#view-chat \.chat-send-bar\{position:fixed;left:0;right:0;bottom:calc\(var\(--tabbar-h\) \+ env\(safe-area-inset-bottom,0px\)\)/.test(css));
check('the fixed bar sits above the nav layer', css.includes('z-index:calc(var(--z-tabbar) + 1)'));
check('the chat view reserves space for the fixed bar', css.includes('#view-chat{padding-bottom:calc(84px + 92px + env(safe-area-inset-bottom,0px))}'));
check('the fix is phone-only; desktop keeps the normal bar', /@media\(max-width:699px\)\{[\s\S]*#view-chat \.chat-send-bar/.test(css));
check('the active record panel submits from the same fixed bar', css.includes('#view-records .record-panel:not([hidden]) form>.button.primary[type=submit]') && css.includes('#view-records{padding-bottom:calc(84px + 92px + env(safe-area-inset-bottom,0px))}'));
check('there is only one chat send button', (html.match(/id="chat-send"/g) || []).length === 1);
check('no second action-bar copy is added', !/id="action-bar"/.test(html));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
