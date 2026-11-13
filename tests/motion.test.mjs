import fs from 'node:fs';
import assert from 'node:assert/strict';

const assets = new URL('../app/src/main/assets/', import.meta.url);
const html = fs.readFileSync(new URL('index.html', assets), 'utf8');
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const css = fs.readFileSync(new URL('styles.css', assets), 'utf8');

// 数字滚动只挂在真正的数值上：今日能量的主数字。挂到标签或目标值上会把「不变的字」也滚一遍。
const calorie = html.match(/<strong id="calorie-value"([^>]*)>/);
assert(calorie, 'the calorie number exists');
assert(/\bdata-count\b/.test(calorie[1]), 'the calorie number opts into count roll');
assert(/count-roll/.test(calorie[1]), 'it uses tabular figures so digits do not jitter');
assert.equal((html.match(/data-count\b/g) || []).length, 1, 'no other node opts into count roll');

// 首帧、reduced-motion、外部渲染插队、库失灵，四条边界都要有明确出口。
assert(/installCountRoll/.test(app), 'the count roll installer is assembled into app.js');
assert(/if \(shown === null\) \{ shown = next; displayed = next; return; \}/.test(app), 'first paint never rolls from zero');
assert(/prefers-reduced-motion: reduce/.test(app), 'the roll respects reduced motion');
assert(/Math\.min\(1, \(now - started\) \/ 320\)/.test(app), 'the fallback loop is bounded to 320ms');
assert(/roll\(displayed === null \? next : displayed, next\)/.test(app), 'a render landing mid-roll continues from the screen');
assert(/setTimeout\(\(\) => \{ if \(shown === to && displayed !== to\) settle\(to\); \}, 420\)/.test(app), 'a watchdog guarantees the final number');
assert(/window\.MotionLib && typeof window\.MotionLib\.animate === 'function'/.test(app), 'the vendored runtime is feature-detected, not assumed');
assert(!/^import /m.test(app), 'app.js stays a plain script');

// 卡片入场交给 Motion：按真实 .card 顺序错帧，6px、28ms、最多 5 张，首帧不表演。
assert(/installViewStagger/.test(app), 'the card entrance installer is assembled');
assert(/delay: index \* 0\.028/.test(app), 'cards are staggered by 28ms');
assert(/y: \[6, 0\]/.test(app), 'cards rise 6px and no more');
assert(/\.slice\(0, 5\)/.test(app), 'at most five cards join one entrance');
assert(/view\.dataset\.motionSeen !== '1'\) \{ view\.dataset\.motionSeen = '1'; return; \}/.test(app), 'first paint does not perform');
assert(!css.includes('@keyframes cardRise'), 'the CSS stagger is gone, not duplicated');

// 动效令牌：三档时长与单一缓动；页面只做淡入，不叠第二套位移。
assert(/--dur-1:140ms;--dur-2:220ms;--dur-3:320ms;--ease-opus:cubic-bezier\(\.2,0,0,1\)/.test(css), 'motion tokens are declared together');
assert(/@keyframes viewFade/.test(css), 'the page cross-fades instead of sliding');
assert(!/\.view:not\(\[hidden\]\)>\.card/.test(css), 'cards are not animated twice');
