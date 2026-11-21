import fs from 'node:fs';
import assert from 'node:assert/strict';

const assets = new URL('../app/src/main/assets/', import.meta.url);
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const css = fs.readFileSync(new URL('styles.css', assets), 'utf8');

// 滑动切换：一屏一格、方向与 TAB_ORDER 一致、到头不回绕。
assert(/installTabSwipe/.test(app), 'the swipe installer is assembled into app.js');
assert(/const SWIPE_X = 56;/.test(app), 'the tap/slide threshold is explicit');
assert(/const SWIPE_MS = 600;/.test(app), 'a slow drag does not switch tabs');
assert(/const SWIPE_RATIO = 1\.6;/.test(app), 'diagonal gestures stay with vertical scrolling');
assert(/TAB_ORDER\[index \+ \(dx < 0 \? 1 : -1\)\]/.test(app), 'left swipe goes forward in tab order');
assert(/if \(!next\) return;/.test(app), 'swiping past the last tab stops instead of wrapping');
assert(/switchTab\(next, true\)/.test(app), 'the swipe reuses the existing tab transition');

// 手势不能吃掉输入、浮层与横向滚动的操作，也不能在「我的」二层页里切走。
assert(/input,textarea,select,\[contenteditable="true"\],\.app-dialog,\.sheet-panel/.test(app), 'inputs and overlays are excluded');
assert(/\.pref-chips,\.chips,\.segmented,\.table-wrap,#chat-chips,\.chat-composer/.test(app), 'horizontal scrollers and the chat composer are excluded');
assert(/profile-hub'\)\?\.hidden\) return;/.test(app), 'a profile subpage keeps the tab put');
assert(/touchstart[\s\S]{0,400}\{ passive: true \}/.test(app), 'the swipe listener never blocks scrolling');

// 纵向滚动仍然是页面的默认手势。
assert(/touch-action:pan-y/.test(css), 'vertical panning stays the page default');
