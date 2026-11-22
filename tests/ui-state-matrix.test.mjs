/**
 * P2 8 state/accessibility checks that are cheap to keep honest:
 * empty/error states, long text boundaries, focus, reduced motion and listeners.
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

check('stateBlock supports empty/loading/error kinds', /const STATE_BLOCK_KINDS = \[[^\]]*'empty'[^\]]*'loading'[^\]]*'error'/.test(app));
check('stateBlock exposes status and alert roles', app.includes('k === \'error\' ? \' role="alert"\'') && app.includes('k === \'loading\' ? \' role="status"'));
check('empty trend state is explained without a second entry', app.includes("title: '记录第一笔体重'") && !app.includes("label: '去记录体重'"));
check('empty trend state clears stale weekly copy', /weekly\.hidden = true/.test(app));
check('long meal names can wrap', /#chat-log \.meal-row p\{white-space:pre-line;overflow-wrap:anywhere\}/.test(css));
check('long preference rows can wrap', /preference-row|hub-summary/.test(css) && /overflow-wrap|text-wrap/.test(css));
check('320px has a narrow-screen rule', /@media\(max-width:360px\)/.test(css));
check('focus-visible styling remains', css.includes(':focus-visible'));
check('reduced motion remains handled', css.includes('prefers-reduced-motion'));
check('the trend tooltip timer is cleared before rerender', app.includes('if (trendTooltipTimer) {clearTimeout(trendTooltipTimer); trendTooltipTimer = null;}'));
check('interval timers have matching clear paths', (app.match(/clearInterval\(/g) || []).length >= (app.match(/setInterval\(/g) || []).length);
check('main buttons expose accessible labels or visible text', html.includes('aria-label="选择分析日期"') && html.includes('aria-label="主要导航"'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
