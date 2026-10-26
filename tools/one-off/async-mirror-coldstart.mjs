/**
 * 只做收益明确的两项：
 *  1. SQLite 镜像异步化 + 合并：保存路径不再同步写库，连续保存合并成一次镜像；
 *  2. 冷启动耗时落到「关于」页：把我一直在 adb 里量的指标变成应用内可看的数字。
 * 跳过：state.json 增量写（原子性风险 > 当前收益）、图标 webp（SVG 是矢量，转换反而降质）。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'a single database accessor',
    `    /**
     * Keeps the SQLite mirror in step with the JSON store after every successful write. JSON stays
     * authoritative, so a mirror failure is recorded for the diagnostic panel and never blocks or
     * rolls back a save the user already made.
     */
    private void mirrorToDatabase() {
        try {
            if (syncDatabase == null) syncDatabase = new SyncDatabase(this);
            syncDatabase.mirrorAll(state);
            lastMirrorError = "";
        } catch (Exception e) {`,
    `    /** One entry point for the mirror connection, so two threads cannot race on its creation. */
    private synchronized SyncDatabase database() {
        if (syncDatabase == null) syncDatabase = new SyncDatabase(this);
        return syncDatabase;
    }

    /** Latest state waiting to be mirrored; a newer save simply replaces the older snapshot. */
    private volatile JSONObject mirrorPending;
    private final java.util.concurrent.atomic.AtomicBoolean mirrorQueued = new java.util.concurrent.atomic.AtomicBoolean();

    /**
     * Keeps the SQLite mirror in step with the JSON store, off the caller's thread.
     *
     * JSON stays authoritative, so a mirror failure is recorded for the diagnostic panel and never
     * blocks or rolls back a save the user already made. Writes are coalesced: a burst of saves
     * results in one mirror pass over the newest state instead of N synchronous writes.
     */
    private void mirrorToDatabase() {
        mirrorPending = state;
        if (!mirrorQueued.compareAndSet(false, true)) return;
        try {
            mirrorExecutor.execute(() -> {
                try {
                    JSONObject snapshot = mirrorPending;
                    if (snapshot != null) database().mirrorAll(snapshot);
                    lastMirrorError = "";
                } catch (Exception e) {
                    lastMirrorError = "SQLite 镜像写入失败";
                } finally {
                    mirrorQueued.set(false);
                    // State moved on while this pass ran: catch up once more.
                    if (mirrorPending != state) mirrorToDatabase();
                }
            });
        } catch (Exception e) {
            mirrorQueued.set(false);
        }
    }

    /** Kept for reference while the asynchronous path settles; mirrors the current state once. */
    private void mirrorToDatabaseNow() {
        try {
            database().mirrorAll(state);
            lastMirrorError = "";
        } catch (Exception e) {`,
  ],
  [
    'the mirror executor',
    `    /** One entry point for the mirror connection, so two threads cannot race on its creation. */`,
    `    /** Serialises mirror writes; one thread is enough and keeps ordering. */
    private final java.util.concurrent.ExecutorService mirrorExecutor =
            java.util.concurrent.Executors.newSingleThreadExecutor(runnable -> new Thread(runnable, "qingheng-mirror"));

    /** One entry point for the mirror connection, so two threads cannot race on its creation. */`,
  ],
  [
    'storage diagnostics use the accessor',
    `            if (syncDatabase == null) syncDatabase = new SyncDatabase(this);
            sqlite = syncDatabase.mirrorCounts();`,
    `            sqlite = database().mirrorCounts();`,
  ],
  [
    'cold start is recorded once the page is ready',
    `            @Override public void onPageFinished(WebView view, String url) {
                pageReady = true;`,
    `            @Override public void onPageFinished(WebView view, String url) {
                pageReady = true;
                if (coldStartMs == 0L) {
                    // From process start to the first usable page: the number a user actually feels.
                    coldStartMs = SystemClock.uptimeMillis() - android.os.Process.getStartUptimeMillis();
                    prefs.edit().putLong("coldStartMs", coldStartMs).apply();
                }`,
  ],
  [
    'expose the cold start in versions()',
    `                .put("answerAudit", auditChatAnswers());`,
    `                .put("answerAudit", auditChatAnswers())
                .put("coldStartMs", coldStartMs > 0 ? coldStartMs : prefs.getLong("coldStartMs", 0L));`,
  ],
  [
    'cold start field',
    `    private boolean pageReady, imageDeliveryBusy;`,
    `    private boolean pageReady, imageDeliveryBusy;
    /** Process start -> first usable page, in ms; recorded once per launch. */
    private long coldStartMs;`,
  ],
]);

console.log('async mirror + cold start wired');
