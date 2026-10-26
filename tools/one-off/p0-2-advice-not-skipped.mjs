/**
 * P0-2: 「当天两段都跳过 → 到 20:30 前没有任何建议」的修复。
 *
 * 去重规则本身是对的（一个时间窗只发一条），但它没有区分「已经发过一条」和「今天一条都没发」：
 * 在没有发过任何建议的日子里，跳过等于整天没有建议。现在只在「今天已经发过」时去重。
 */
import {patch} from '../lib/patch.mjs';

// --- scheduler: a day with nothing posted still gets its catch-up reminder -------------------------
patch('app/src/main/java/cn/qingheng/health/AlarmScheduler.java', [
  [
    'remember which day the last reminder belonged to',
    `    public static void markPosted(Context context) {
        prefs(context).edit().putLong(KEY_LAST_POSTED_AT, System.currentTimeMillis()).apply();
    }`,
    `    public static void markPosted(Context context) {
        prefs(context).edit()
                .putLong(KEY_LAST_POSTED_AT, System.currentTimeMillis())
                .putString(KEY_LAST_POSTED_DAY, today())
                .apply();
    }

    /**
     * True when a reminder was actually posted today. The de-duplication rules only make sense once
     * something was posted: on a day with no advice at all, skipping leaves the user with silence.
     */
    public static boolean postedToday(Context context) {
        return today().equals(prefs(context).getString(KEY_LAST_POSTED_DAY, ""));
    }`,
  ],
  [
    'catch-up wins over the gap rule when nothing was posted',
    `        if (nextUpcomingTrigger(context) - now < MIN_GAP_MS) {`,
    `        // Silence is worse than a slightly early reminder: only honour the gap rule if today already
        // produced one, otherwise deliver the most recent missed slot.
        if (postedToday(context) && nextUpcomingTrigger(context) - now < MIN_GAP_MS) {`,
  ],
]);

// --- receiver: same rule for the post-meal feedback ------------------------------------------------
patch('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', [
  [
    'meal feedback is not dropped on a silent day',
    `        if (AlarmScheduler.tooSoonAfterLastPost(context)) {
            AlarmScheduler.markRan(context, today, slot);
            recordSkip(context, today, slot);
            return;
        }`,
    `        if (AlarmScheduler.tooSoonAfterLastPost(context) && AlarmScheduler.postedToday(context)) {
            AlarmScheduler.markRan(context, today, slot);
            recordSkip(context, today, slot);
            return;
        }`,
  ],
]);

// --- the KEY constant lives with the other prefs keys ----------------------------------------------
patch('app/src/main/java/cn/qingheng/health/AlarmScheduler.java', [
  [
    'declare the new pref key',
    `    public static final long MIN_GAP_MS = 3 * 60 * 60 * 1000L;`,
    `    public static final long MIN_GAP_MS = 3 * 60 * 60 * 1000L;
    /** Day of the last posted reminder, so "already posted today" is answerable. */
    private static final String KEY_LAST_POSTED_DAY = "lastPostedDay";`,
  ],
]);

console.log('P0-2 wired');
