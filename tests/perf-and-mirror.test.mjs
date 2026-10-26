/**
 * 本轮两项优化的断言：SQLite 镜像异步化 + 冷启动可视化。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const app = read('app/src/main/assets/app.js');

// --- the mirror no longer runs on the caller's thread --------------------------------------------------
check('a single-thread mirror executor exists', main.includes('Executors.newSingleThreadExecutor(runnable -> new Thread(runnable, "qingheng-mirror"))'));
check('the mirror queues instead of blocking', main.includes('mirrorPending = state;') && main.includes('mirrorQueued.compareAndSet(false, true)'));
check('a newer save replaces the pending snapshot', main.includes('mirrorPending != state) mirrorToDatabase();'));
check('the connection is created behind one accessor', main.includes('private synchronized SyncDatabase database()'));
check('the storage panel uses the accessor', main.includes('sqlite = database().mirrorCounts();'));
check('JSON stays authoritative in the wording', (main + app).includes('SQLite 为同步镜像') || (main + app).includes('SQLite 只是同步镜像'));

// --- cold start is visible in the app --------------------------------------------------------------------
check('the field exists', main.includes('private long coldStartMs;'));
check('it is measured from process start', main.includes('android.os.Process.getStartUptimeMillis()'));
check('it is recorded once, when the page is ready', main.includes('if (coldStartMs == 0L)') && main.includes('prefs.edit().putLong("coldStartMs", coldStartMs).apply();'));
check('it is exposed by the versions route', main.includes('.put("coldStartMs"'));
check('it is rendered on the about page', app.includes("冷启动 <b>${fmt(coldStart, 0)}</b> ms"));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
