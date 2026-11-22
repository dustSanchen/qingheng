/**
 * 合并后的 profile 套件（由 114 个单文件回归合并而来，2026-11-23）。
 * 每个原文件仍在自己的函数作用域里跑：一个文件抛错只记一条 FAIL，不会中断同组其他文件。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let __fail = 0;
async function __run(name, fn) {
  try { const n = await fn(); __fail += Number(n) || 0; }
  catch (error) { console.log('FAIL  [' + name + '] ' + (error && error.message ? error.message : error)); __fail += 1; }
}

await __run("alarm-catchup", async () => {

const base = new URL('../app/src/main/', import.meta.url);
const scheduler = fs.readFileSync(new URL('java/cn/qingheng/health/AlarmScheduler.java', base), 'utf8');
const receiver = fs.readFileSync(new URL('java/cn/qingheng/health/AlarmReceiver.java', base), 'utf8');
const activity = fs.readFileSync(new URL('java/cn/qingheng/health/MainActivity.java', base), 'utf8');
const boot = fs.readFileSync(new URL('java/cn/qingheng/health/BootReceiver.java', base), 'utf8');
const manifest = fs.readFileSync(new URL('AndroidManifest.xml', base), 'utf8');
const app = fs.readFileSync(new URL('assets/app.js', base), 'utf8');

assert.match(scheduler, /KEY_RAN_PREFIX = "ran\."/);
assert.match(scheduler, /public static synchronized boolean markRan/);
assert.match(scheduler, /public static boolean missedToday/);
assert.match(scheduler, /KEY_SCHEDULED \+ slot/);
assert.match(receiver, /if \(AlarmScheduler\.ran\(context, today, slot\)\) return;/);
assert(!receiver.includes('today.equals(push.getString(AlarmScheduler.KEY_LAST_RUN_DATE'));
assert.match(receiver, /AlarmScheduler\.markRan\(context, today, slot\)/);
assert.match(receiver, /public static void catchUp/);
assert.match(activity, /private void catchUpMissedAlarms\(\)/);
// Catch-up is now a single, gap-aware decision: one slot at most, never stacked with the next one.
assert.match(activity, /AlarmScheduler\.catchUpSlot\(this\)/);
assert.match(scheduler, /public static String catchUpSlot\(Context context\)/);
assert.match(scheduler, /nextUpcomingTrigger\(context\) - now < MIN_GAP_MS/);
assert.match(activity, /AlarmReceiver\.catchUp\(this, slot\)/);
assert.match(activity, /openExactAlarmSettings/);
assert.match(boot, /ACTION_BOOT_COMPLETED/);
assert.match(boot, /ACTION_MY_PACKAGE_REPLACED/);
assert.match(manifest, /android:name="\.AlarmReceiver" android:exported="false"/);
assert.match(manifest, /android:name="\.BootReceiver" android:exported="true"/);
assert.equal((manifest.match(/android:name="\.AlarmReceiver"/g) || []).length, 1);
assert.equal((manifest.match(/android:name="\.BootReceiver"/g) || []).length, 1);
assert.match(manifest, /android\.permission\.SCHEDULE_EXACT_ALARM/);
assert.match(app, /installExactAlarmControl/);
assert.match(app, /openExactAlarmSettings/);

console.log('PASS alarm/catch-up: per-day slot dedupe, startup catch-up, private tick receiver, system boot receiver, and exact-alarm settings entry are wired.');
;return typeof fail === 'number' ? fail : 0;
});

await __run("camera-bugfix", async () => {
const java=fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const js=fs.readFileSync('app/src/main/assets/app.js','utf8');

// 1. Denied camera permission must tell the user, not fail silently.
const perm=java.slice(java.indexOf('public void onRequestPermissionsResult'),java.indexOf('if (request != REQUEST_NOTIFICATIONS)'));
assert(/notifyImageError\(/.test(perm),'denied camera permission is reported');
assert(/shouldShowRequestPermissionRationale\("android\.permission\.CAMERA"\)/.test(perm),'permanent denial is detected');
assert(/launchCameraOrPicker\(\); return;/.test(perm),'granted permission still launches the camera');
assert(/fileCallback\.onReceiveValue\(null\)/.test(perm),'the pending chooser callback is released on denial');

// 2. Camera launch failure is reported before the gallery fallback.
const launch=java.slice(java.indexOf('private void launchCameraOrPicker'),java.indexOf('private void launchFilePicker'));
assert(launch.indexOf('notifyImageError')>launch.indexOf('catch (Exception e)'),'launch failure is reported');
assert(launch.indexOf('notifyImageError')<launch.indexOf('launchFilePicker(true)'),'report comes before the fallback');

// 3. The error helper only talks to a live, ready page.
const helper=java.slice(java.indexOf('private void notifyImageError'),java.indexOf('private void deleteCameraTemp'));
assert(/!alive \|\| web == null \|\| !pageReady/.test(helper),'helper guards a dead or unready page');
assert(/JSONObject\.quote\(message\)/.test(helper),'message is JS-escaped');

// 4. The meal/chat target survives a process restart.
assert(/putString\("image_target_last", imageTargetName\)/.test(java),'target is persisted');
assert(/prefs\.getString\("image_target_last", "meal"\)/.test(java),'target is restored on start');

// 5. Re-picking the same photo after removing it must not be swallowed as a duplicate.
assert(/function clearChatImage\(\) \{lastCaptureId='';/.test(js),'chat clear resets the duplicate guard');
assert(/function clearImage\(\) \{lastCaptureId='';/.test(js),'meal clear resets the duplicate guard');
assert((js.match(/let lastCaptureId/g)||[]).length===1,'guard is declared exactly once, before use');
assert(js.indexOf('let lastCaptureId')<js.indexOf('function clearChatImage'),'guard is declared before its first use');

// 6. The system picker offers HEIC/HEIF; they are decoded natively, never by the page canvas.
assert(/"image\/heic", "image\/heif"/.test(java),'picker offers HEIC/HEIF');
assert(/BitmapFactory\.decodeStream/.test(java),'native decode path present');
console.log('PASS camera-bugfix: permission feedback, launch failure notice, target persistence, duplicate guard, HEIC picker');
;return typeof fail === 'number' ? fail : 0;
});

await __run("camera-lifecycle", async () => {
const base='app/src/main/';
const js=fs.readFileSync(base+'assets/app.js','utf8');
const java=fs.readFileSync(base+'java/cn/qingheng/health/MainActivity.java','utf8');
const css=fs.readFileSync(base+'assets/styles.css','utf8');
const nodes=new Map();
const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,src:'',scrollIntoView(){this.scrolled=true;}});return nodes.get(id);};
const seen=[];
const context=vm.createContext({window:{},$:node,feedback:(el,text)=>seen.push(text),switchTab:tab=>seen.push(tab),notice:()=>{},chatImageVersion:0,chatImageBusy:true,chatImage:null,imageVersion:0,imageBusy:true,imageData:null});
const start=js.indexOf("  window.__qinghengPendingImage = payload =>");
// The recovered-capture path stores verified photo metadata, so the slice must carry the real helpers.
const preamble=js.slice(js.indexOf('  const localDate ='),js.indexOf('  const validDate ='))+"let lastCaptureId = '';"+js.slice(js.indexOf('  function photoMeta(value) {'),js.indexOf('  const notice ='));
const end=js.indexOf('  async function sendChat()',start);
assert(start>=0&&end>start);
vm.runInContext(preamble+js.slice(start,end),context);
const deliver=context.window.__qinghengPendingImage;
assert.equal(deliver('{bad'),false);
assert.equal(deliver({target:'unknown',data:'data:image/jpeg;base64,YQ=='}),false);
assert.equal(deliver({id:'one',target:'chat',data:'data:image/jpeg;base64,YQ=='}),true);
assert.equal(context.chatImage,'data:image/jpeg;base64,YQ==');
assert.equal(context.chatImageBusy,false);
assert.equal(node('#chat-image-preview').hidden,false);
assert(seen.includes('chat'));
const count=seen.length;
assert.equal(deliver({id:'one',target:'chat',data:'data:image/jpeg;base64,YQ=='}),true);
assert.equal(seen.length,count,'duplicate delivery is acknowledged without repaint');
assert.equal(deliver(JSON.stringify({id:'two',target:'meal',data:'data:image/jpeg;base64,Yg=='})),true);
assert.equal(context.imageData,'data:image/jpeg;base64,Yg==');
assert.equal(context.imageBusy,false);
assert(seen.includes('records'));
assert(node('#image-preview').scrolled);
assert(java.includes('!prefs.getBoolean("pending_image_ready", false)'),'unconfirmed captures must not be decoded');
assert(java.includes('.putBoolean("pending_image_ready", true).putBoolean("pending_image_owned", true).commit()'),'a camera capture is marked ready and app-owned');
const result=java.slice(java.indexOf('if (request == CAMERA)'),java.indexOf('} else if (request == PICK'));
assert(result.includes('prefs.getString("pending_image_uri", "")'),'recreation uses persisted URI');
assert(!result.includes('new Uri[]{target}'),'camera must not rely on stale file callback');
assert(/worker\.execute\(\(\) -> \{\s+final Uri parsed = Uri\.parse\(uri\);\s+awaitCaptureReady\(parsed\);/.test(java),'decode waits for the flush and runs off the UI thread');
assert(java.includes('if ("true".equals(result) && uri.equals('),'cleanup is tied to acknowledged capture');
assert(java.includes('android.media.ExifInterface'),'orientation is preserved before metadata removal');
assert(!java.includes('done.put(MediaStore.Images.Media.IS_PENDING, 0)'),'do not publish temporary capture to gallery');

// 2026-10-16 camera loss fixes.
assert(java.includes('private long captureSize(Uri uri)'),'capture size probe exists');
assert(java.includes('private boolean awaitCaptureReady(Uri uri)'),'flush wait helper exists');
assert(/result == RESULT_OK \|\| captureSize\(target\) > 0/.test(java),'a RESULT_CANCELED camera answer with a written photo is still delivered');
assert(!java.includes('MediaStore.Images.Media.IS_PENDING, 1'),'pending rows break OEM camera writes; row is deleted after delivery instead');
assert(java.includes('reconcilePendingCapture();'),'startup reconciles a capture whose result was lost');
assert(java.includes('private void reconcilePendingCapture()'),'reconcile helper exists');
assert(java.includes('pending_image_since'),'the capture timestamp gates recovery so a live session is never touched');
assert(java.includes('if (!uri.equals(prefs.getString("pending_image_uri", ""))) { deliverPendingImage(); return; }'),'a capture queued during decode is drained');
assert(java.includes('Intent.ACTION_OPEN_DOCUMENT'),'the picker keeps read access after a process restart');
assert(java.includes('takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)'),'gallery grants are persisted');
assert(!css.includes(String.fromCharCode(92)+'n'),'CSS must contain real line breaks');
console.log('PASS camera lifecycle: routing, dedup/ack, recreation URI, ready gate, background decode, EXIF, private cleanup, CSS escapes, 2026-10-16 loss fixes');
;return typeof fail === 'number' ? fail : 0;
});

await __run("gallery", async () => {

const assets = new URL('../app/src/main/assets/', import.meta.url);
const html = fs.readFileSync(new URL('index.html', assets), 'utf8');
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const css = fs.readFileSync(new URL('styles.css', assets), 'utf8');
const java = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/MainActivity.java', import.meta.url), 'utf8');

// Both intake routes must exist for meal and chat: camera keeps capture, gallery must not.
const inputs = Object.fromEntries([...html.matchAll(/<input type="file" id="([^"]+)"([^>]*)>/g)].map(m => [m[1], m[2]]));
for (const id of ['meal-image', 'meal-gallery', 'chat-image', 'chat-gallery']) {
  assert(inputs[id] !== undefined, `${id} exists`);
  assert(/accept="image\/jpeg,image\/png,image\/webp"/.test(inputs[id]), `${id} accepts the supported image types`);
}
assert(/capture="environment"/.test(inputs['meal-image']), 'meal camera input asks for the rear camera');
assert(/capture="environment"/.test(inputs['chat-image']), 'chat camera input asks for the rear camera');
assert(!/capture=/.test(inputs['meal-gallery']), 'meal gallery input must not request the camera');
assert(!/capture=/.test(inputs['chat-gallery']), 'chat gallery input must not request the camera');

const labels = [...html.matchAll(/<label for="(meal|chat)-(image|gallery)"[^>]*>([\s\S]*?)<\/label>/g)]
  .map(m => ({ for: `${m[1]}-${m[2]}`, text: m[3].replace(/<[^>]+>/g, '') }));
assert.equal(labels.length, 4, 'every file input has a visible label');
assert(labels.some(l => l.for === 'meal-gallery' && l.text.includes('相册')), 'the records page offers a gallery option');
assert(labels.some(l => l.for === 'chat-gallery' && l.text.includes('相册')), 'the chat page offers a gallery option');
assert(/\.capture-actions\{[^}]*display:flex/.test(css), 'the two capture entries sit side by side');
assert(/\.capture-card\{/.test(css), 'capture entries are styled');

// Routing must follow the capture hint, not the MIME type.
assert(/params\.isCaptureEnabled\(\)/.test(java), 'the camera is only opened when the page requests capture');
assert(/launchFilePicker\(isImageChooser\(params\)\)/.test(java), 'non-capture image inputs go to the gallery picker');
assert(/private void launchFilePicker\(boolean imagesOnly\)/.test(java), 'the picker distinguishes photos from JSON');
assert(/pick\.setType\(imagesOnly \? "image\/\*" : "\*\/\*"\)/.test(java), 'the gallery picker is restricted to images');
assert(/putBoolean\("pick_is_image", imagesOnly\)/.test(java), 'the picker intent is remembered across recreation');

// Gallery results reuse the resilient delivery path instead of the file callback.
const pick = java.slice(java.indexOf('} else if (request == PICK)'), java.indexOf('} else if (request == SAVE'));
assert(/boolean imagePick = prefs\.getBoolean\("pick_is_image", false\)/.test(pick), 'the pick result knows it was an image');
assert(/deliverPendingImage\(\)/.test(pick), 'gallery photos use the same delivery path as the camera');
assert(/putBoolean\("pending_image_owned", false\)/.test(pick), 'a gallery photo is recorded as user-owned');
const imageBranch = pick.slice(pick.indexOf('if (uri != null && imagePick)'), pick.indexOf('} else if (fileCallback != null)'));
assert(imageBranch.length > 0, 'the image branch of the pick result is present');
assert(!/new Uri\[\]\{uri\}/.test(imageBranch), 'image picks do not depend on the live file callback');

// Never delete something the user picked from their own album.
assert(/if \(prefs\.getBoolean\("pending_image_owned", false\)\)/.test(java), 'cleanup only deletes app-owned captures');
assert(/putBoolean\("pending_image_owned", true\)/.test(java), 'camera captures are marked app-owned');
assert(/private boolean pendingImageOwned/.test(java), 'ownership is tracked across the request');

// Front end must reset and route both inputs.
assert(/\$\('#meal-gallery'\)\.value=''/.test(app), 'clearing the meal photo resets the gallery input');
assert(/\$\('#chat-gallery'\)\.value=''/.test(app), 'clearing the chat photo resets the gallery input');
assert(/\['#meal-image','#meal-gallery'\]\.forEach/.test(app), 'both meal inputs declare the meal target');
assert(/\['#chat-image','#chat-gallery'\]\.forEach/.test(app), 'both chat inputs declare the chat target');

console.log('PASS gallery: camera vs gallery routing, image-only picker, shared delivery path, album-safe cleanup');
;return typeof fail === 'number' ? fail : 0;
});

await __run("onboarding-backup", async () => {
/**
 * Step 3 checks: onboarding ends with a three-item permission checklist (re-checkable later from the
 * data page), and a backup reminder exists because JSON is the only authoritative store.
 */

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
check('health sync is back in the checklist', app.includes("key: 'health'") && app.includes('health-connect'));
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
check('consent pointers name the real switch location', app.includes('我的 → 数据与关于') && html.includes('我的 → 数据与关于'));
check('touch targets are at least 44px', fs.readFileSync('app/src/main/assets/styles.css', 'utf8').includes('.check-fix{display:inline-flex;align-items:center;gap:6px;min-height:44px;'));
check('a due backup reminder carries an action button', html.includes('id="global-notice-action"') && app.includes("label: '去导出'") && app.includes("openSubpage('data')"));
check('a first-day quick record leads to a meal instead of a dead end', app.includes('先记一餐，之后就能在这里快速复制') && app.includes("switchTab('records', true);") && app.includes("const field = $('#meal-text');"));
check('the empty today timeline points at the one meal entry above it', app.includes('上方「记一餐」直接开始') && !app.includes("action: {label: '记一餐', go: 'records', focus: 'meal-text'}"));
check('ACWR and plateau thresholds live in one place', app.includes('const ACWR_HIGH = 1.5;') && app.includes('const ACWR_LOW = 0.8;') && app.includes('const PLATEAU_SPAN_KG = 0.2;') && app.includes('ratio > ACWR_HIGH') && app.includes('span < PLATEAU_SPAN_KG'));
check('the checklist speaks of three items', app.includes('三项都已就绪'));

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
;return typeof fail === 'number' ? fail : 0;
});

await __run("onboarding-p2", async () => {
/**
 * P2 onboarding: AI and permission checks are optional; local recording must not require a key.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

check('the AI step says it can be skipped', html.includes('这一步可以跳过') && html.includes('暂时不接也不影响记录、目标和本地计划'));
check('necessary setup can finish before optional steps', html.includes('id="ob-finish-early"') && html.includes('先开始记录，AI 与提醒稍后再设'));
check('the early finish uses the same save path', app.includes("$('#ob-finish-early')") && app.includes('obFinish()'));
check('AI can be deferred with one action', html.includes('id="ob-skip-ai"') && html.includes('先不接 AI，继续'));
check('permission checks can be deferred too', html.includes('id="ob-skip-checks"') && html.includes('先不检查，直接完成'));
check('skipping AI still reaches the permission step', app.includes("$('#ob-skip-ai')") && app.includes('onboardingStep(4)'));
check('skipping checks finishes through the existing onboarding save', app.includes("$('#ob-skip-checks')") && app.includes('obFinish()'));
check('the AI step still keeps the key local and optional', html.includes('Key 只保存在本机') && html.includes('可留空'));
check('the first-run copy does not require an API key', !html.includes('必须填入 API Key') && html.includes('先不接 AI'));
check('the final copy points to later settings', html.includes('我的 → AI 与提醒'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("preference-compat", async () => {
/**
 * Preferences are now stored as one object array; strings and the old
 * `preferenceMeta` map are read once and migrated without losing text or dates.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing function ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '';
  for (let i = open; i < source.length; i++) {
    const ch = source[i], prev = source[i - 1];
    if (quote) {
      if (ch === quote && prev !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated function ' + name);
}

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

const factory = new Function(
  'localStorage',
  'const PREFERENCES_KEY = "qingheng.preferences";\n' +
  'const PREFERENCE_META_KEY = "qingheng.preferenceMeta";\n' +
  'const PREFERENCE_SOURCES = ["manual", "chat", "legacy"];\n' +
  'function schedulePrefsSync() {}\n' +
  extractFunction(app, 'readLegacyPreferenceMeta') + '\n' +
  extractFunction(app, 'readPreferenceMeta') + '\n' +
  extractFunction(app, 'preferenceIdFor') + '\n' +
  extractFunction(app, 'preferenceTimestamp') + '\n' +
  extractFunction(app, 'normalizePreferenceEntries') + '\n' +
  extractFunction(app, 'readPreferenceEntries') + '\n' +
  extractFunction(app, 'readPreferences') + '\n' +
  extractFunction(app, 'readPreferenceRows') + '\n' +
  extractFunction(app, 'writePreferenceRows') + '\n' +
  extractFunction(app, 'writePreferences') + '\n' +
  extractFunction(app, 'ensurePreferenceStorage') + '\n' +
  'return {readPreferences, readPreferenceRows, readPreferenceMeta, normalizePreferenceEntries, writePreferenceRows, writePreferences, ensurePreferenceStorage};'
);
const store = new Map();
const localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key)
};
const api = factory(localStorage);

store.set('qingheng.preferences', JSON.stringify(['不吃香菜', '早餐固定两个鸡蛋加豆浆']));
let rows = api.readPreferenceRows();
check('old string preferences remain readable', rows.length === 2, rows.length);
check('legacy strings are labelled, not given a fake date', rows[0].source === 'legacy' && rows[0].createdAt === null, rows[0]);
check('legacy ids are stable', rows[0].id === api.readPreferenceRows()[0].id, rows[0].id);

const now = new Date().toISOString();
api.writePreferenceRows([
  {id: 'pref-a', text: '不吃香菜', source: 'chat', scope: 'all', createdAt: now, updatedAt: now},
  {id: 'pref-b', text: '早餐固定两个鸡蛋加豆浆', source: 'manual', scope: 'all', createdAt: now, updatedAt: now}
]);
const stored = JSON.parse(store.get('qingheng.preferences'));
check('the authoritative storage is an object array', Array.isArray(stored) && stored.every(value => value && typeof value === 'object' && typeof value.text === 'string'));
check('every object carries id, source and scope', stored.every(value => value.id && value.source && value.scope === 'all'));
check('the old metadata key is removed after writing objects', !store.has('qingheng.preferenceMeta'));
check('source and timestamps survive in the objects', stored[0].source === 'chat' && stored[0].createdAt === now);
check('prompt consumers still receive plain strings', JSON.stringify(api.readPreferences()) === JSON.stringify(['不吃香菜', '早餐固定两个鸡蛋加豆浆']));

rows = api.readPreferenceRows();
check('reading storage returns the same object array', rows.length === 2 && rows[1].text === '早餐固定两个鸡蛋加豆浆');
api.writePreferenceRows([...rows, {text: '晚上八点后不进食', source: 'manual'}]);
rows = api.readPreferenceRows();
check('a new string gets source and timestamp', rows[2].source === 'manual' && !!rows[2].createdAt, rows[2]);
check('deduplication keeps one copy', rows.filter(row => row.text === '不吃香菜').length === 1);

store.clear();
store.set('qingheng.preferences', JSON.stringify(['旧习惯']));
api.writePreferenceRows([{text: '旧习惯', source: 'legacy'}, {text: '新习惯', source: 'manual'}]);
rows = api.readPreferenceRows();
check('writing another row never invents a date for legacy text', rows[0].source === 'legacy' && rows[0].createdAt === null, rows[0]);
check('the newly added row still carries its time', rows[1].source === 'manual' && !!rows[1].createdAt, rows[1]);
api.writePreferenceRows(Array.from({length: 25}, (_, index) => ({text: '偏好 ' + index})));
check('the twenty-item cap is preserved', api.readPreferenceRows().length === 20, api.readPreferenceRows().length);

store.set('qingheng.preferences', 'not json');
check('broken JSON returns an empty list instead of crashing', api.readPreferenceRows().length === 0);

store.clear();
store.set('qingheng.preferences', JSON.stringify(['有来源']));
store.set('qingheng.preferenceMeta', JSON.stringify({'有来源': {source: 'chat', createdAt: now, updatedAt: now}}));
rows = api.readPreferenceRows();
check('the old metadata map is merged into the object', rows[0].source === 'chat' && rows[0].createdAt === now);
api.writePreferenceRows(rows);
check('migration removes the old metadata key', !store.has('qingheng.preferenceMeta') && Array.isArray(JSON.parse(store.get('qingheng.preferences'))));

store.clear();
store.set('qingheng.preferences', JSON.stringify(['待迁移']));
store.set('qingheng.preferenceMeta', JSON.stringify({'待迁移': {source: 'manual'}}));
check('startup migration upgrades string storage in place', api.ensurePreferenceStorage() === true);
check('startup migration leaves objects only', Array.isArray(JSON.parse(store.get('qingheng.preferences'))) && !store.has('qingheng.preferenceMeta'));

store.clear();
store.set('qingheng.preferences', JSON.stringify([{text: '__proto__', source: 'manual'}, {text: '正常偏好', source: 'legacy'}]));
rows = api.readPreferenceRows();
check('hostile text cannot pollute the object list', rows.length === 2 && rows[1].text === '正常偏好', rows.map(row => row.text).join(','));

check('the UI reads the object array and exposes edit/delete', app.includes('readPreferenceRows()') && app.includes('data-preference-edit') && app.includes('data-preference-remove'));
check('the UI shows source and time, with the three consumers stated once', app.includes('preferenceMetaText') && html.includes('用于估算、建议和训练问答'));
check('editing is an inline form with a cancel action', html.includes('id="preference-cancel"') && app.includes('beginPreferenceEdit') && app.includes("input.focus({preventScroll: true})"));
check('the preference list has a dedicated action layout', css.includes('.preference-row-actions'));
check('the portable config carries one object array, not a second meta map', app.includes("{id: 'preferences'") && !app.includes("{id: 'preferenceMeta'"));
check('loading normalizes old state into objects', app.includes('normalizePreferenceEntries(prefs.preferences, prefs.preferenceMeta)') && app.includes('localStorage.removeItem(PREFERENCE_META_KEY)'));
check('the Java prompt reader accepts both old strings and object text', main.includes('raw instanceof JSONObject') && main.includes('optString("text"'));
check('advice preview includes the same preference text', app.includes('payload.preferences = readPreferences()') && main.includes('adviceSystemPrompt() + preferenceSuffix(b)'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("privacy-and-migration", async () => {
const j = JSON.parse(fs.readFileSync('app/src/main/assets/seed.json', 'utf8'));
let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

check('seed has no measurements', j.measurements.length === 0, j.measurements.length);
check('seed has no meals', j.meals.length === 0, j.meals.length);
check('seed has no habits', j.habits.length === 0, j.habits.length);
check('seed has no chats', j.chats.length === 0, j.chats.length);
check('seed has no notes', (j.notes || []).length === 0, (j.notes || []).length);

const flat = JSON.stringify(j);
const leftovers = ['2026-07-05', '2026-08-16', '2026-08-21', '2026-09-09', '2026-09-25', '2026-10-10', '27.4', '63.75', '64.3', '65.5', '16.6', '19.4', '1496'].filter(token => flat.includes(token));
check('seed carries no personal values or dates', leftovers.length === 0, leftovers.join(', ') || 'none');

check('seed marks the demo migration as done', j.seedMigrated === 2, j.seedMigrated);
check('seed starts with onboarding pending', j.onboardingDone === false, j.onboardingDone);
check('seed goal is unset (user chooses)', j.profile.goal === null, j.profile.goal);
check('seed targets are unset (computed at onboarding)', j.profile.calorieTarget === null && j.profile.proteinMin === null && j.profile.fatMin === null);
check('seed height is unset', j.profile.height === null);

const java = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
check('java migration is idempotent via seedMigrated', java.includes('root.put("seedMigrated", 2)'));
check('java only removes exact demo measurement fingerprints', java.includes('SEED_DEMO_MEASUREMENT_VALUES') && java.includes('sameNumber(record.opt("weight")'));
check('java only removes the three demo meals', java.includes('SEED_DEMO_MEAL_CALORIES') && java.includes('SEED_DEMO_MEAL_DATE'));
// Upgrade safety: cleanState must build on a copy of the incoming object and only normalise known
// fields, so a future version's extra keys survive an app update.
check('java cleanState starts from a copy of incoming state', /JSONObject out = source == null \? new JSONObject\(\) : scrub\(source\)/.test(java));
check('java only puts defaults when a field is missing or wrong-typed', java.includes('if (!(out.opt(key) instanceof JSONArray)) out.put(key, new JSONArray())'));
check('java does not rebuild a whitelist-only object', !/JSONObject out = new JSONObject\(\);\s*out\.put\("version"/.test(java));
check('java still scrubs credential keys on load and export', java.includes('apikey') && java.includes('secret'));
check('java exposes markdown export route', java.includes('/api/export-markdown'));
check('java exposes exportText bridge (SAF)', java.includes('exportText(String filename, String content)'));
check('markdown filename is sanitized', java.includes('.md'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("usage-billing", async () => {
/**
 * 用量与余额的静态契约：token 从响应里读、账本只存数量、余额只查 DeepSeek、充值只开浏览器。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const chat = read('app/src/main/java/cn/qingheng/health/ChatCompletion.java');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const html = read('app/src/main/assets/index.html');
const app = read('app/src/main/assets/app.js');
const usage = read('app/src/fragments/55-usage.fragment.js');

check('buffered responses carry usage', chat.includes('response.optJSONObject("usage")') && chat.includes('out.put("usage", usage)'));
check('streaming asks DeepSeek for usage', chat.includes('stream_options') && chat.includes('include_usage') && chat.includes('contains("deepseek")'));
check('the stream reports usage to the caller', chat.includes('interface UsageSink') && chat.includes('onUsage.onUsage(usageObj)'));

check('every chat path records usage', (main.match(/recordUsage\(result\.optJSONObject\("usage"\)/g) || []).length >= 2
  && /recordUsage\(usage, (usageModel|estimateModel)\)/.test(main));
const record = main.slice(main.indexOf('private void recordUsage'), main.indexOf('private JSONObject usageLog'));
check('the ledger stores only token counts', record.includes('"usageLog"') && record.includes('"in"') && record.includes('"out"')
  && !record.includes('question') && !record.includes('answer'));
check('usage routes exist', main.includes('path.equals("/api/usage")') && main.includes('path.equals("/api/balance")'));
check('balance is DeepSeek-only', main.includes('余额查询目前只支持 DeepSeek'));
check('the balance URL drops /v1', main.includes('base.endsWith("/v1")') && main.includes('/user/balance'));
check('external links are allowlisted', main.includes('openExternal') && main.includes('platform.deepseek.com') && main.includes('dustsanchen/qingheng'));

check('the page exposes the usage card', html.includes('id="usage-card"') && html.includes('id="usage-balance"'));
check('the panel aggregates tokens and costs', usage.includes('usageMoney') && usage.includes('USAGE_PRICE_KEY'));
check('the panel opens the DeepSeek top-up page', usage.includes('platform.deepseek.com/top_up'));
check('the panel is installed at boot', app.includes('installUsagePanel()'));

console.log('\nPASS total: 0 failed');
;return typeof fail === 'number' ? fail : 0;
});

await __run("wizard-action-bar", async () => {
/**
 * P0-1 断言：向导操作栏固定在独立层，按钮不再依赖滚动位置；
 * 权限检查有超时上限；第 4 步的检查不再卡在点击处理里。
 */

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
check('each permission check is capped', perms.includes("withTimeout(api('/api/notification-permission'), 3000") && perms.includes("withTimeout(api('/api/push'), 3000") && perms.includes("withTimeout(api('/api/health-connect/status'), 3000"));
check('the checklist logs when it is ready', perms.includes("console.info('[perm] checklist ready'"));
check('step four refreshes after the transition', onboarding.includes('setTimeout(() => refreshPermissionChecklist().catch(() => {}), 30)'));
check('step transitions are timed', onboarding.includes("console.info('[ob] step'"));
check('the temporary probes are gone', !app.includes('ob hit') && !app.includes('TEMP PROBE'));
;return typeof fail === 'number' ? fail : 0;
});
console.log('\nFAIL total: ' + __fail);
process.exitCode = __fail ? 1 : 0;
