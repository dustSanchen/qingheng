import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/00-head.fragment.js', [
  ['auto dismiss after ten seconds',
   "  const notice = (message, error = false) => { const node = $('#global-notice'); node.textContent = message; node.classList.toggle('error',error); node.hidden = !message; };",
   `  let noticeTimer = null;
  /** Hides the notice and lets the page flow back up (it sits in the document flow, not as an overlay). */
  function hideNotice() {
    const node = $('#global-notice'), text = $('#global-notice-text');
    if (noticeTimer) { clearTimeout(noticeTimer); noticeTimer = null; }
    if (text) text.textContent = '';
    if (node) node.hidden = true;
  }
  const notice = (message, error = false) => {
    const node = $('#global-notice'), text = $('#global-notice-text');
    if (!node || !text) return;
    text.textContent = message;
    node.classList.toggle('error', error);
    node.hidden = !message;
    if (noticeTimer) { clearTimeout(noticeTimer); noticeTimer = null; }
    // A notice used to stay until the next action, pushing the page down the whole time.
    if (message) noticeTimer = setTimeout(hideNotice, 10000);
  };`],
]);
patch('app/src/fragments/70-rest.fragment.js', [
  ['close button hides it immediately',
   "  $('#render-error-retry')?.addEventListener('click', () => {",
   "  $('#global-notice-close')?.addEventListener('click', () => hideNotice());\n  $('#render-error-retry')?.addEventListener('click', () => {"],
]);
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.notice-close{')) {
  css += `
/* Close button inside the notice; hiding it returns the space to the page. */
.notice{display:flex;align-items:flex-start;gap:10px}
.notice[hidden]{display:none}
.notice>span{flex:1 1 auto}
.notice-close{flex:0 0 auto;width:24px;height:24px;padding:0;border:0;border-radius:8px;background:transparent;color:inherit;font-size:16px;line-height:1;opacity:.7}
.notice-close:active{opacity:1;background:#00000010}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  notice styles');
}
console.log('notice wired');
