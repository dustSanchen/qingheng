package cn.qingheng.health;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import java.util.Calendar;
import java.util.Locale;

/**
 * Schedules the two daily analysis alarms.
 *
 * Settings live in SharedPreferences "push_prefs" so that the receiver can read them without the
 * Activity. Exact alarms are used when the platform allows them (API 31+ requires the user grant,
 * and we never assume it); otherwise the inexact idle-friendly form keeps the feature working.
 *
 * Idempotence matters here: an inexact alarm carries a delivery window, and cancelling plus
 * re-registering it restarts that window. Because the Activity used to reschedule on every launch,
 * opening the app during the morning window pushed the morning alarm out again and again, which is
 * why the daytime reminder often never arrived. A slot is now left alone while a still-future
 * registration for the same slot exists.
 */
public final class AlarmScheduler {
    public static final String PREFS = "push_prefs";
    public static final String ACTION_TICK = "cn.qingheng.health.PUSH_TICK";
    public static final String EXTRA_SLOT = "slot";
    public static final String SLOT_MORNING = "morning", SLOT_EVENING = "evening", SLOT_MEAL = "meal", SLOT_WEEKLY = "weekly";
    public static final String KEY_ENABLED = "enabled";
    public static final String KEY_MORNING_TIME = "morningTime";
    public static final String KEY_EVENING_TIME = "eveningTime";
    public static final String KEY_ANALYSIS_ENABLED = "analysisEnabled";
    public static final String KEY_WEEKLY_ENABLED = "weeklyEnabled";
    public static final String KEY_WEEKLY_DAY = "weeklyDay";
    public static final String KEY_WEEKLY_TIME = "weeklyTime";
    public static final String KEY_LAST_RUN_DATE = "lastRunDate";
    public static final String KEY_LAST_SLOT = "lastSlot";
    public static final String KEY_LAST_RESULT = "lastResult";
    /** Two reminders must never share one window; the gap also guards the catch-up path. */
    public static final long MIN_GAP_MS = 3 * 60 * 60 * 1000L;
    /** Day of the last posted reminder, so "already posted today" is answerable. */
    private static final String KEY_LAST_POSTED_DAY = "lastPostedDay";
    private static final String KEY_LAST_POSTED_AT = "lastPostedAt";
    public static final String DEFAULT_MORNING = "07:00", DEFAULT_EVENING = "20:30", DEFAULT_WEEKLY_TIME = "20:00";
    /** ISO weekday for the weekly review: 7 = Sunday, matching the documented routine. */
    public static final int DEFAULT_WEEKLY_DAY = 7;
    /** Remembers which wall-clock instant is currently registered for a slot, so it is not reset. */
    private static final String KEY_SCHEDULED = "scheduledAt.";
    /** ran.<yyyy-MM-dd>.<slot> marks a delivered notification, one per slot per day. */
    private static final String KEY_RAN_PREFIX = "ran.";
    /** Stable request codes: 7001 morning, 7002 evening. */
    public static final int REQUEST_MORNING = 7001, REQUEST_EVENING = 7002, REQUEST_MEAL = 7003, REQUEST_WEEKLY = 7004;
    private static final String HHMM = "^([01]\\d|2[0-3]):[0-5]\\d$";

    private AlarmScheduler() { }

    public static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static boolean enabled(Context context) {
        return prefs(context).getBoolean(KEY_ENABLED, false);
    }

    public static String timeFor(Context context, String slot) {
        SharedPreferences p = prefs(context);
        if (SLOT_WEEKLY.equals(slot)) {
            String weekly = p.getString(KEY_WEEKLY_TIME, DEFAULT_WEEKLY_TIME);
            return valid(weekly) ? weekly : DEFAULT_WEEKLY_TIME;
        }
        String fallback = SLOT_EVENING.equals(slot) ? DEFAULT_EVENING : DEFAULT_MORNING;
        String value = SLOT_EVENING.equals(slot)
                ? p.getString(KEY_EVENING_TIME, DEFAULT_EVENING)
                : p.getString(KEY_MORNING_TIME, DEFAULT_MORNING);
        return valid(value) ? value : fallback;
    }

    /** The weekly review is part of the documented routine, so it is on unless the user turns it off. */
    public static boolean weeklyEnabled(Context context) {
        return prefs(context).getBoolean(KEY_WEEKLY_ENABLED, true);
    }

    /** ISO weekday 1..7 for the weekly review. */
    public static int weeklyDay(Context context) {
        int day = prefs(context).getInt(KEY_WEEKLY_DAY, DEFAULT_WEEKLY_DAY);
        return day >= 1 && day <= 7 ? day : DEFAULT_WEEKLY_DAY;
    }

    /** Next occurrence of (weekday, HH:mm); today when it is still ahead and the weekday matches. */
    public static long nextWeeklyTrigger(Context context) {
        java.util.Calendar when = java.util.Calendar.getInstance();
        String hhmm = timeFor(context, SLOT_WEEKLY);
        when.set(java.util.Calendar.HOUR_OF_DAY, Integer.parseInt(hhmm.substring(0, 2), 10));
        when.set(java.util.Calendar.MINUTE, Integer.parseInt(hhmm.substring(3, 5), 10));
        when.set(java.util.Calendar.SECOND, 0);
        when.set(java.util.Calendar.MILLISECOND, 0);
        int target = weeklyDay(context);
        for (int i = 0; i < 8; i++) {
            int iso = when.get(java.util.Calendar.DAY_OF_WEEK) == java.util.Calendar.SUNDAY
                    ? 7 : when.get(java.util.Calendar.DAY_OF_WEEK) - 1;
            if (iso == target && when.getTimeInMillis() > System.currentTimeMillis()) return when.getTimeInMillis();
            when.add(java.util.Calendar.DAY_OF_YEAR, 1);
        }
        return when.getTimeInMillis();
    }

    public static boolean valid(String value) { return value != null && value.matches(HHMM); }

    /** Schedule both slots, leaving an already-registered future alarm for a slot untouched. */
    public static void scheduleAll(Context context) {
        scheduleSlot(context, SLOT_MORNING, timeFor(context, SLOT_MORNING));
        scheduleSlot(context, SLOT_EVENING, timeFor(context, SLOT_EVENING));
        if (weeklyEnabled(context)) scheduleAt(context, SLOT_WEEKLY, nextWeeklyTrigger(context));
        else cancelSlot(context, SLOT_WEEKLY);
    }

    public static void cancelAll(Context context) {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        SharedPreferences.Editor edit = prefs(context).edit();
        if (manager != null) {
            manager.cancel(pending(context, SLOT_MORNING, REQUEST_MORNING));
            manager.cancel(pending(context, SLOT_EVENING, REQUEST_EVENING));
            manager.cancel(pending(context, SLOT_MEAL, REQUEST_MEAL));
            manager.cancel(pending(context, SLOT_WEEKLY, REQUEST_WEEKLY));
        }
        edit.remove(KEY_SCHEDULED + SLOT_MORNING).remove(KEY_SCHEDULED + SLOT_EVENING).remove(KEY_SCHEDULED + SLOT_WEEKLY).apply();
    }

    /**
     * The single entry point used by the activity, the receiver and BOOT_COMPLETED: honour the
     * stored enabled flag and (re)arm or clear both slots accordingly.
     */
    public static void rescheduleIfEnabled(Context context) {
        if (enabled(context)) scheduleAll(context);
        else cancelAll(context);
    }

    /** True when the platform will accept an exact alarm right now. */
    @SuppressWarnings("deprecation")
    public static boolean canScheduleExact(Context context) {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        return manager != null && manager.canScheduleExactAlarms();
    }

    /** Opens the system screen where the user can allow this app to set exact alarms. */
    public static Intent exactAlarmSettingsIntent(Context context) {
        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
        intent.setData(Uri.parse("package:" + context.getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return intent;
    }

    private static void scheduleSlot(Context context, String slot, String hhmm) {
        scheduleAt(context, slot, nextTrigger(hhmm));
    }

    /** Registers one slot at an explicit instant, keeping an existing earlier-or-equal registration. */
    private static void scheduleAt(Context context, String slot, long triggerAt) {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        if (manager == null) return;
        SharedPreferences p = prefs(context);
        // Keep an existing future registration: replacing it would restart an inexact window.
        long already = p.getLong(KEY_SCHEDULED + slot, 0L);
        if (already > System.currentTimeMillis() && already <= triggerAt) return;
        PendingIntent intent = pending(context, slot, request(slot));
        try {
            if (canScheduleExact(context)) manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent);
            else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent);
            p.edit().putLong(KEY_SCHEDULED + slot, triggerAt).apply();
        } catch (SecurityException denied) {
            // Permission can be revoked between the check and the call; degrade instead of crashing.
            try {
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent);
                p.edit().putLong(KEY_SCHEDULED + slot, triggerAt).apply();
            } catch (Exception ignored) { }
        } catch (Exception ignored) { }
    }

    private static void cancelSlot(Context context, String slot) {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        if (manager == null) return;
        try { manager.cancel(pending(context, slot, request(slot))); } catch (Exception ignored) { }
        prefs(context).edit().remove(KEY_SCHEDULED + slot).apply();
    }

    private static int request(String slot) {
        if (SLOT_WEEKLY.equals(slot)) return REQUEST_WEEKLY;
        if (SLOT_EVENING.equals(slot)) return REQUEST_EVENING;
        if (SLOT_MEAL.equals(slot)) return REQUEST_MEAL;
        return REQUEST_MORNING;
    }

    /**
     * Records-triggered feedback: one notification a short while after a meal is saved, instead of
     * waiting for a fixed clock time. Only the first record of a day arms it (see ran.<day>.meal),
     * so a day of logging produces one timely note rather than a stream of them.
     */
    public static void scheduleMealFeedback(Context context, long delayMillis) {
        if (!enabled(context)) return;
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        if (manager == null) return;
        long triggerAt = System.currentTimeMillis() + Math.max(60_000L, delayMillis);
        PendingIntent intent = pending(context, SLOT_MEAL, REQUEST_MEAL);
        try {
            if (canScheduleExact(context)) manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent);
            else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent);
        } catch (Exception ignored) { }
    }

    public static void cancelMealFeedback(Context context) {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        if (manager == null) return;
        try { manager.cancel(pending(context, SLOT_MEAL, REQUEST_MEAL)); } catch (Exception ignored) { }
    }

    private static PendingIntent pending(Context context, String slot, int request) {
        Intent tick = new Intent(context, AlarmReceiver.class);
        tick.setAction(ACTION_TICK);
        tick.putExtra(EXTRA_SLOT, slot);
        return PendingIntent.getBroadcast(context, request, tick,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Local yyyy-MM-dd, matching the date format written by the web layer. */
    public static String today() {
        return new java.text.SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(new java.util.Date());
    }

    /** True once this slot has already delivered its notification for the given day. */
    public static boolean ran(Context context, String day, String slot) {
        return prefs(context).getBoolean(KEY_RAN_PREFIX + day + "." + slot, false);
    }

    /** Claims a delivered slot and keeps the legacy last-run fields in step. */
    public static synchronized boolean markRan(Context context, String day, String slot) {
        if (ran(context, day, slot)) return false;
        return prefs(context).edit()
                .putBoolean(KEY_RAN_PREFIX + day + "." + slot, true)
                .putString(KEY_LAST_RUN_DATE, day)
                .putString(KEY_LAST_SLOT, slot)
                .commit();
    }

    /** Releases a claim when notification posting fails, allowing the next open to retry. */
    public static synchronized void clearRan(Context context, String day, String slot) {
        prefs(context).edit().remove(KEY_RAN_PREFIX + day + "." + slot).apply();
    }

    /**
     * True when this slot's time for today has already passed and no notification was delivered,
     * so the Activity can catch it up instead of silently losing the day.
     */
    public static boolean missedToday(Context context, String slot) {
        if (!enabled(context)) return false;
        String today = today();
        if (ran(context, today, slot)) return false;
        return todayTrigger(timeFor(context, slot)) < System.currentTimeMillis();
    }

    /** The soonest slot instant that is still ahead (today, or tomorrow morning). */
    public static long nextUpcomingTrigger(Context context) {
        long morning = nextTrigger(timeFor(context, SLOT_MORNING));
        long evening = nextTrigger(timeFor(context, SLOT_EVENING));
        long soonest = Math.min(morning, evening);
        if (weeklyEnabled(context)) soonest = Math.min(soonest, nextWeeklyTrigger(context));
        return soonest;
    }

    /**
     * The single slot a catch-up may deliver right now, or null.
     *
     * Two rules, both learned from the reported bug (a white-morning and an evening reminder arriving
     * in the same window):
     * <ol>
     *   <li>At most one slot is caught up per launch — the most recent missed one.</li>
     *   <li>Nothing is caught up when the next scheduled slot is already close, because that would
     *       put two reminders within {@link #MIN_GAP_MS}; the skipped slots are marked so they are
     *       not retried later with stale content.</li>
     * </ol>
     */
    public static String catchUpSlot(Context context) {
        if (!enabled(context)) return null;
        String today = today();
        long now = System.currentTimeMillis();
        boolean morningMissed = !ran(context, today, SLOT_MORNING) && todayTrigger(timeFor(context, SLOT_MORNING)) < now;
        boolean eveningMissed = !ran(context, today, SLOT_EVENING) && todayTrigger(timeFor(context, SLOT_EVENING)) < now;
        if (!morningMissed && !eveningMissed) return null;
        String latest = eveningMissed ? SLOT_EVENING : SLOT_MORNING;
        // Silence is worse than a slightly early reminder: only honour the gap rule if today already
        // produced one, otherwise deliver the most recent missed slot.
        if (postedToday(context) && nextUpcomingTrigger(context) - now < MIN_GAP_MS) {
            // Too close to the next reminder: skip rather than stack two in one window.
            for (String slot : new String[]{SLOT_MORNING, SLOT_EVENING}) {
                if ((SLOT_MORNING.equals(slot) && morningMissed) || (SLOT_EVENING.equals(slot) && eveningMissed)) {
                    markRan(context, today, slot);
                    AlarmReceiver.recordSkip(context, today, slot);
                }
            }
            return null;
        }
        // A later missed window supersedes an earlier one: the user gets one current reminder.
        if (eveningMissed) {
            markRan(context, today, SLOT_MORNING);
            AlarmReceiver.recordSkip(context, today, SLOT_MORNING);
        }
        return latest;
    }

    /** When the last reminder was actually posted, so two can never land in one window. */
    public static long lastPostedAt(Context context) {
        return prefs(context).getLong(KEY_LAST_POSTED_AT, 0L);
    }

    public static void markPosted(Context context) {
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
    }

    /** True when posting now would put two reminders inside {@link #MIN_GAP_MS}. */
    public static boolean tooSoonAfterLastPost(Context context) {
        long last = lastPostedAt(context);
        return last > 0 && System.currentTimeMillis() - last < MIN_GAP_MS;
    }

    /** Today's scheduled instant for the slot, even if it has already passed. */
    static long todayTrigger(String hhmm) {
        int hour = 7, minute = 0;
        if (valid(hhmm)) {
            hour = Integer.parseInt(hhmm.substring(0, 2), 10);
            minute = Integer.parseInt(hhmm.substring(3, 5), 10);
        }
        Calendar when = Calendar.getInstance();
        when.set(Calendar.HOUR_OF_DAY, hour);
        when.set(Calendar.MINUTE, minute);
        when.set(Calendar.SECOND, 0);
        when.set(Calendar.MILLISECOND, 0);
        return when.getTimeInMillis();
    }

    /** Next local occurrence of HH:mm: today if still ahead, otherwise tomorrow. */
    static long nextTrigger(String hhmm) {
        long today = todayTrigger(hhmm);
        if (today > System.currentTimeMillis()) return today;
        Calendar when = Calendar.getInstance();
        when.setTimeInMillis(today);
        when.add(Calendar.DAY_OF_YEAR, 1);
        return when.getTimeInMillis();
    }
}
