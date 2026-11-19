/**
 * P0-1 断言：向导操作栏固定在独立层，按钮不再依赖滚动位置；
 * 权限检查有超时上限；第 4 步的检查不再卡在点击处理里。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const css = read('app/src/main/assets/styles.css');
const app = read('app/src/main/assets/app.js');
const perms = read('app/src/fragments/20-permissions-backup.fragment.js');
const onboarding = read('app/src/fragments/50-onboarding.fragment.js');

// --- the action bar is its own fixed layer ----------------------------------------------------------
check('the wizard actions are pinned to the bottom', css.includes('.onboarding-actions{position:fixed'));
check('the bar sits above page content', css.includes('z-index:90'));
check('the bar keeps the buttons full width', css.includes('.onboarding-actions .button{flex:1 1 auto}'));
check('the scroll container reserves room for the bar', css.includes('.onboarding{padding-bottom:calc(112px'));

// --- no tap-blocking wait inside the step transition --------------------------------------------------
check('a timeout helper exists', app.includes('function withTimeout(promise, ms, label)'));
check('each permission check is capped', perms.includes("withTimeout(api('/api/notification-permission'), 3000") && perms.includes("withTimeout(api('/api/push'), 3000") && !perms.includes('health-connect'));
check('the checklist logs when it is ready', perms.includes("console.info('[perm] checklist ready'"));
check('step four refreshes after the transition', onboarding.includes('setTimeout(() => refreshPermissionChecklist().catch(() => {}), 30)'));
check('step transitions are timed', onboarding.includes("console.info('[ob] step'"));
check('the temporary probes are gone', !app.includes('ob hit') && !app.includes('TEMP PROBE'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
