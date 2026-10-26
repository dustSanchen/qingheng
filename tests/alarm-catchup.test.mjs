import fs from 'node:fs';
import assert from 'node:assert/strict';

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
