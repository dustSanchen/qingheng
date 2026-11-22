/**
 * 今天页状态胶囊 + 行动罗盘内嵌 + ⋯ 工具栏（2026-11-22, 1.5.17）。
 * 约定：一屏只有一条提示面；罗盘在能量卡内；换一天/复制一餐/指标选择收进菜单。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

// --- 状态胶囊 ---------------------------------------------------------------------------
check('the strip exists and starts hidden', html.includes('id="status-strip"') && /id="status-strip"[^>]*hidden/.test(html));
check('energy advice feeds the strip instead of its own line', app.includes('TODAY_SIGNALS.energy = parts.map(text => ({text, tone:') && app.includes('renderTodayStatusStrip(true)'));
check('the check verdict feeds the same strip', app.includes('TODAY_SIGNALS.check = check.verdict') && app.includes('renderTodayStatusStrip(false)'));
check('the strip rotates only when there is more than one message', app.includes('list.length > 1') && app.includes('}, 6000)'));
check('tap advances the strip', app.includes('statusCursor = (statusCursor + 1) % list.length'));
check('no second warning surface remains', html.includes('id="calorie-action" hidden'));

// --- 行动罗盘内嵌 -----------------------------------------------------------------------
check('the compass lives inside the energy card', html.indexOf('id="slot-hint"') > html.indexOf('class="card energy-card"') &&
  html.indexOf('id="slot-hint"') < html.indexOf('id="energy-check"'));
check('the panel no longer moves it out', !app.includes('energyCard.after(slotHint)'));
check('the compass keeps its in-card styling', css.includes('#view-today .energy-card .slot-hint.is-next'));

// --- 工具栏收进菜单 ---------------------------------------------------------------------
check('the header has one more button', html.includes('id="today-more"'));
check('the menu carries the three actions', app.includes("label: '换一天'") && app.includes("label: '复制一餐'") && app.includes("label: '显示指标'"));
check('date jump stays visible on today', css.includes('html[data-tab="today"] .date-jump{display:inline-flex'));
check('quick copy is a visible quiet link again', css.includes('#quick-record{display:inline-flex'));
check('soft shadows replace card borders on today', css.includes('--shadow-soft:0 8px 24px -6px color-mix(in srgb,var(--ink) 6%,transparent)') && css.includes('#view-today .card{border:0;box-shadow:var(--shadow-soft)'));
check('gradients are allowed only on progress and the compass', css.includes('--ring-fill-soft') && css.includes('#view-today .energy-card .slot-hint.is-next{'));
check('the strip swaps with a short fade', app.includes("textNode.classList.add('is-swap')") && css.includes('@keyframes stripSwap'));
check('press feedback is scale .98', css.includes('#view-today .habit-cell:active,#view-today .slot-hint:active,#view-today .quick-chip:active{transform:scale(.98)}'));

// --- 常用指标 ---------------------------------------------------------------------------
check('metric preference is stored locally', app.includes("'qingheng.todayMetrics'") && app.includes('function saveTodayMetrics'));
check('the habit grid honours the preference', app.includes("todayMetrics() : ['steps', 'water', 'sleep']"));
check('the grid filters by chosen keys', app.includes('.filter(cell => (typeof todayMetrics === \'function\''));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
