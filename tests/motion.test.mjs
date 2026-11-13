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

// 首帧与 reduced-motion 是这条动效的两条底线，缺一条就会变成噪音。
assert(/installCountRoll/.test(app), 'the count roll installer is assembled into app.js');
assert(/shown === null\) \{ shown = next; return; \}/.test(app), 'first paint never rolls from zero');
assert(/prefers-reduced-motion: reduce/.test(app), 'the roll respects reduced motion');
assert(/Math\.min\(1, \(now - started\) \/ 320\)/.test(app), 'the roll is bounded to 320ms');
assert(!/^import /m.test(app), 'no dependency is introduced');

// 动效令牌与错帧：三档时长、单一缓动、位移 6px、错帧不超过 140ms。
assert(/--dur-1:140ms;--dur-2:220ms;--dur-3:320ms;--ease-opus:cubic-bezier\(\.2,0,0,1\)/.test(css), 'motion tokens are declared together');
const delays = [...css.matchAll(/\.view:not\(\[hidden\]\)>\.card:nth-child\((\d|n\+6)\)\{animation-delay:(\d+)ms\}/g)]
  .map((m) => Number(m[2]));
assert(delays.length >= 4, 'cards are staggered');
assert(Math.max(...delays) <= 140, 'the stagger never runs past 140ms');
assert(/@keyframes cardRise\{from\{opacity:0;transform:translateY\(6px\)\}/.test(css), 'cards rise 6px and no more');
assert(/@keyframes viewFade/.test(css), 'the page cross-fades instead of sliding');
assert(/@media \(prefers-reduced-motion: reduce\)\{\s*\.view:not\(\[hidden\]\)>\.card\{animation:none!important\}/.test(css), 'reduced motion drops the stagger');
