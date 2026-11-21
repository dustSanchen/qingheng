/**
 * Cross-page button/motion finish: press feedback, one hover language, readable
 * record summary, and reduced-motion safety via existing global rule.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('buttons animate color and transform', css.includes('.button{transition:background var(--dur-fast) var(--ease-opus),border-color var(--dur-fast) var(--ease-opus),color var(--dur-fast) var(--ease-opus),transform var(--dur-fast) var(--ease-opus)}'));
check('hover feedback exists for primary/subtle/text/icon', css.includes('.button.primary:hover') && css.includes('.button.subtle:hover') && css.includes('.text-button:hover') && css.includes('.icon-button:hover'));
check('segments and chips have state transitions', css.includes('.segment{transition:color var(--dur-fast) var(--ease-opus)') && css.includes('.chip-toggle{transition:background var(--dur-fast)'));
check('record summary is a readable data line, not muted fine print', css.includes('#today-meta,#records-meta{font-size:var(--text-md);color:var(--ink-soft)'));
check('reduced motion remains globally respected', css.includes('@media(prefers-reduced-motion:reduce)'));
check('chat send and attachments give press feedback', css.includes('.chat-send-button:active,.chat-attach-button:active{transform:scale(.94)}'));
check('notice slides in with the shared ease', css.includes('@keyframes noticeIn') && css.includes('.notice{animation:noticeIn'));
check('no transition-all fallback is introduced', !/transition:\s*all/.test(css));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
