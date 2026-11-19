/**
 * Step 3 checks: onboarding ends with a three-item permission checklist (re-checkable later from the
 * data page), and a backup reminder exists because JSON is the only authoritative store.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const routes = fs.readFileSync('app/src/main/java/cn/qingheng/health/bridge/MetaRoutes.java', 'utf8');

// --- onboarding now has four steps -----------------------------------------------------------------
check('onboarding is four steps', app.includes('const onboarding = {step: 1, total: 4, done: false, result: null, saving: false};'));
check('the lead text says four steps', html.includes('四步完成设置'));
check('a fourth dot exists', html.includes('<span class="step-dot" data-step="4"></span>'));
check('a fourth step section exists', /<section class="onboarding-step" data-step="4" hidden>/.test(html));
check('the fourth step holds the checklist', html.includes('<div class="check-list" id="ob-checks" role="list"></div>'));
check('the fourth step has a refresh button', html.includes('id="ob-check-refresh"'));
check('entering step four refreshes the states', app.includes('if (onboarding.step === 4) setTimeout(() => refreshPermissionChecklist().catch(() => {}), 30);'));
check('the permission refresh never blocks the step change', app.includes("setTimeout(() => refreshPermissionChecklist()"));

// --- the two items and their routes (Health Connect was removed on purpose) --------------------------
check('two items are defined', app.includes('const PERMISSION_ITEMS = [') && app.includes("key: 'notifications'") && app.includes("key: 'exactAlarm'"));
check('health sync stays out of the checklist', !app.includes("key: 'health'") && !app.includes('health-connect'));
check('states come from the existing routes', app.includes("await api('/api/notification-permission')") && app.includes("await api('/api/push')"));
check('an unknown state is shown as unknown, not as a failure', app.includes("const tag = granted === null ? '状态未知'"));
check('both containers are rendered from one function', app.includes("for (const id of ['#ob-checks', '#data-checks'])"));
check('notification permission is requested through the existing helper', app.includes('const granted = await ensureNotificationPermission();'));
check('denied notification state uses the documented empty block', app.includes("item.key === 'notifications' && granted === false") && app.includes("empty('通知权限没有打开', '到系统设置 → 应用 → 轻衡 → 通知开启；否则到点提醒不会出现。', 'denied')"));
check('the denied explanation keeps the permission request action', app.includes('data-check-fix="${item.key}"') && app.includes('esc(item.action)'));
check('unknown notification state keeps the ordinary explanation', app.includes("granted === null ? '状态未知'") && app.includes('esc(item.why)'));
check('exact alarm opens the system screen instead of faking it', app.includes("bridge.openExactAlarmSettings()"));
check('nothing is granted silently: every fix is a user tap', app.includes("if (button) fixPermission(button.dataset.checkFix)"));
check('state re-checks when the app becomes visible again', app.includes("document.addEventListener('visibilitychange'") && app.includes("if (document.visibilityState !== 'visible' || !loaded) return;"));
check('both pages refresh at startup', app.includes('readPermissionState().then(renderPermissionChecklist)'));

// --- the data page carries the same checklist -------------------------------------------------------
check('the data page has the checklist', html.includes('<div class="check-list" id="data-checks" role="list"></div>'));
check('the data page shows a summary tag', html.includes('id="perm-check-tag"') && app.includes('全部就绪'));
check('the quick record dialog can be dismissed with Esc', app.includes('function closeQuickRecord()') && app.includes("event.key === 'Escape'") && app.includes('quickRecordOpener'));
check('load failures show a retry bar instead of a fake loader', app.includes('loadFailed = true') && app.includes('showRenderError(error)'));
check('consent pointers name the real switch location', app.includes('更多设置 → 数据管理') && html.includes('更多设置 → 数据管理'));
check('touch targets are at least 44px', fs.readFileSync('app/src/main/assets/styles.css', 'utf8').includes('.check-fix{display:inline-flex;align-items:center;gap:6px;min-height:44px;'));
check('a due backup reminder carries an action button', html.includes('id="global-notice-action"') && app.includes("label: '去导出'") && app.includes("openSubpage('data')"));
check('a first-day quick record leads to a meal instead of a dead end', app.includes('先记一餐，之后就能在这里快速复制') && app.includes("switchTab('records', true);") && app.includes("const field = $('#meal-text');"));
check('the empty today timeline points at the one meal entry above it', app.includes('上方「记一餐」直接开始') && !app.includes("action: {label: '记一餐', go: 'records', focus: 'meal-text'}"));
check('ACWR and plateau thresholds live in one place', app.includes('const ACWR_HIGH = 1.5;') && app.includes('const ACWR_LOW = 0.8;') && app.includes('const PLATEAU_SPAN_KG = 0.2;') && app.includes('ratio > ACWR_HIGH') && app.includes('span < PLATEAU_SPAN_KG'));
check('the checklist speaks of two items', app.includes('两项都已就绪'));

// --- backup reminder --------------------------------------------------------------------------------
check('native exposes backup bookkeeping', routes.includes('path.equals("/api/backup")') && main.includes('public JSONObject recordBackup(int records)'));
check('native records when the export happened', main.includes('next.put("backup", new JSONObject().put("at", System.currentTimeMillis())'));
check('native counts records across all collections', /for \(String key : new String\[\]\{"meals", "measurements", "habits", "chats"\}\)/.test(main));
check('a week without a backup makes it due', main.includes('else if (days >= 7) reason = "上次备份在 " + days + " 天前";'));
check('twenty new records make it due', main.includes('else if (current - recordsAtBackup >= 20) reason = "上次备份后新增 " + (current - recordsAtBackup) + " 条记录";'));
check('a first run with no backup is due', main.includes('if (at == 0) reason = "还没有导出过备份";'));
check('the app version is recorded with the backup', main.includes('.put("appVersion", versionName())') && main.includes('private String versionName()'));
check('the page shows when the last export happened', app.includes('上次导出：'));
check('the reminder fires at most once a day', app.includes('const key = `qingheng.backup-reminded.${localDate()}`;'));
check('the reminder explains the risk', app.includes('卸载应用会一起删除'));
check('a successful export is recorded', app.includes('async function markBackedUp()') && app.includes("await api('/api/backup', {records:"));
check('both export paths record the backup', (app.split('await markBackedUp();').length - 1) === 2);
check('a bookkeeping failure never fails the export', app.includes('A failed bookkeeping write must not fail the export'));
check('the data page explains the rule', html.includes('建议每 7 天或新增 20 条记录后导出一次'));
check('the backup card has its own export button', html.includes('id="backup-now"') && app.includes("$('#export-data').click();"));

// --- styles -----------------------------------------------------------------------------------------
check('checklist rows are styled', css.includes('.check-row{') && css.includes('.check-row.ok{'));
check('state is not conveyed by colour alone', css.includes('.check-row.todo{border-style:dashed}'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
