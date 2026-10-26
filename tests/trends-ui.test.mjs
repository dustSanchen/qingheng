import fs from 'node:fs';
import assert from 'node:assert/strict';

const assets = new URL('../app/src/main/assets/', import.meta.url);
const html = fs.readFileSync(new URL('index.html', assets), 'utf8');
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const css = fs.readFileSync(new URL('styles.css', assets), 'utf8');

// Observation range: 7 days added in ascending order, 30 days stays the default.
const rangeBlock = html.match(/<select id="trend-range">([\s\S]*?)<\/select>/);
assert(rangeBlock, 'trend range select exists');
const options = [...rangeBlock[1].matchAll(/<option value="([^"]+)"([^>]*)>([^<]+)<\/option>/g)]
  .map(m => ({ value: m[1], selected: m[2].includes('selected'), label: m[3] }));
assert.deepEqual(options.map(o => o.value), ['7', '30', '90', 'all'], '7-day range is offered first');
assert.equal(options.filter(o => o.selected).length, 1, 'exactly one default range');
assert.equal(options.find(o => o.selected).value, '30', '30 days remains the default range');
assert(options[0].label.includes('7'), 'the short range is labelled in days');

// The range value drives the cutoff, so a shorter range must stay valid.
assert(/Number\(range\)-1\)\*86400000/.test(app), 'range still maps to a day cutoff');

// 断言更新登记（03-global-changes.md §5.1）：作者个人邮箱与署名已按隐私要求删除，
// 这里改为断言「页面里不再出现联系方式」与「免责声明保留」。
const footer = html.match(/<footer class="page-footer">([\s\S]*?)<\/footer>/);
assert(footer, 'profile page footer exists');
assert(!/mailto:/.test(html), 'no personal contact link remains in the page');
assert(footer[1].includes('\u4e0d\u80fd\u66ff\u4ee3\u533b\u7597\u8bca\u65ad'), 'the disclaimer stays in the footer');

// Chart geometry is sized for a phone, and axis text is large enough to read.
const geo = app.match(/const W=(\d+),H=(\d+),L=(\d+),R=(\d+),T=(\d+),B=(\d+),plotW/);
assert(geo, 'chart geometry is declared');
const [W, H, L, R, T, B] = geo.slice(1).map(Number);
assert(W <= 400, 'view box is close to the rendered phone width so text is not scaled down');
assert(H > W * 0.5, 'chart is tall enough to read on a phone');
assert(L + R < W / 2, 'plot area keeps most of the width');
assert(T + B < H / 2, 'plot area keeps most of the height');
assert(app.includes('viewBox="0 0 ${W} ${H}"'), 'the view box uses the declared dimensions');

const axisFont = Number(css.match(/\.chart-text\{[^}]*font-size:(\d+(?:\.\d+)?)px/)[1]);
assert(axisFont >= 13, `axis numbers are legible on a phone (got ${axisFont}px)`);
assert(/\.chart-value\{[^}]*font-size:(12px|var\(--text-sm\))/.test(css), 'per-point value labels are styled');
assert(/\.chart-point\{[^}]*stroke-width:3\}/.test(css), 'data points are thick enough to see');
assert(/\.chart-wrap\{[^}]*max-width:560px/.test(css), 'chart does not balloon on wide screens');

// Value labels only appear when they cannot collide.
assert(/points\.length<=7 \? points\.map/.test(app), 'point values are limited to short ranges');
assert(/\$\{values\}\$\{labels\}/.test(app), 'value labels are rendered above the date axis');

assert(!/\.page-author/.test(css), 'the author-line styling went with the element');
console.log('PASS trends UI: 7-day range, single default, no personal credit in the footer, phone-sized axes, short-range value labels');
