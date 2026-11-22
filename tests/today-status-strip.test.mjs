/**
 * 今天页「一条行动行」（2026-11-22, 四模块清单之一）。
 * 约定：首屏只有一个行动面 #today-action；左边执行下一步，右边 1/N › 打开半屏「今天的状况」；
 * 原来分居两处的 #slot-hint（下一步）与 #status-strip（状态轮播）都不再存在。
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

// --- 只留一条 ---------------------------------------------------------------------------
check('the two old surfaces are gone', !html.includes('id="status-strip"') && !html.includes('id="slot-hint"'));
check('exactly one action line exists', (html.match(/id="today-action"/g) || []).length === 1);
check('it sits after the macros and before the check', html.indexOf('id="macro-summary"') < html.indexOf('id="today-action"') &&
  html.indexOf('id="today-action"') < html.indexOf('id="energy-check"'));
check('it starts hidden', /id="today-action"[^>]*hidden/.test(html));
check('left half executes, right half opens the sheet', html.includes('id="today-action-main"') && html.includes('id="today-action-more"') &&
  app.includes('openRecordTarget(target)') && app.includes('openDayBrief'));

// --- 数据源 -------------------------------------------------------------------------------
check('the action line reads the agenda', app.includes('function todayActionItems()') && app.includes('todayAgendaState()'));
check('the check verdict and energy signals feed the sheet', app.includes('TODAY_SIGNALS.check = check.verdict') && app.includes('TODAY_SIGNALS.energy = parts.map(text => ({text, tone:'));
check('the sheet reads the same status list', app.includes('const statuses = todayStatusList()') && app.includes("${(briefCursor % statuses.length) + 1}/${statuses.length}"));
check('no auto rotation is left behind', !app.includes('statusTimer') && !app.includes('}, 6000)'));
check('tapping the strip advances the sheet carousel', app.includes("strip.addEventListener(\"click\", advance)") && app.includes('briefCursor = (briefCursor + 1) % statuses.length'));

// --- 动效 ---------------------------------------------------------------------------------
check('the swap animation lives on the action text', app.includes('$("#today-action-text")') && app.includes('text.classList.add("is-swap")'));
check('it swaps with a short fade', css.includes('.today-action-text.is-swap{animation:stripSwap 180ms'));
check('reduced motion turns it off', css.includes('.today-action-text.is-swap{animation:none}'));
check('press feedback stays at scale .98 on the chips', css.includes('#view-today .habit-cell:active,#view-today .quick-chip:active{transform:scale(.98)') ||
  css.includes('#today-quick-actions .quick-chip:active{transform:scale(.98)}'));

// --- 胶囊与 sheet -------------------------------------------------------------------------
check('the three entries are one continuous capsule group', css.includes('#view-today #today-quick-actions{grid-template-columns:repeat(3,minmax(0,1fr));gap:0') &&
  css.includes('background-image:linear-gradient(180deg,color-mix(in srgb,var(--accent) 9%') &&
  css.includes('#view-today #today-quick-actions .quick-chip+.quick-chip{border-left:1px solid'));
check('the brief sheet exists as a half sheet', html.includes('id="day-brief-sheet"') && html.includes('id="brief-strip"') && html.includes('id="brief-list"'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
