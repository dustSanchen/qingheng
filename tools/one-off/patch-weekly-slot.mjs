/*
 * Step 4b: a third reminder slot -- the weekly review (default Sunday 20:00). The daily slots stay
 * as they are; the weekly one has its own trigger, its own request code and its own prompt.
 */
import fs from 'node:fs';

function patch(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  // The sources use CRLF; anchors written here use LF, so match whichever the file actually has.
  const crlf = text.includes('\r\n');
  for (const [label, fromRaw, toRaw] of edits) {
    const from = crlf ? fromRaw.replace(/\n/g, '\r\n') : fromRaw;
    const to = crlf ? toRaw.replace(/\n/g, '\r\n') : toRaw;
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`${file} :: ${label}: expected 1 anchor, found ${count}`);
    text = text.replace(from, to);
    console.log(`ok  ${label}`);
  }
  fs.writeFileSync(file, text);
}

patch('app/src/main/java/cn/qingheng/health/AlarmScheduler.java', [
  [
    'slot constants',
    '    public static final String SLOT_MORNING = "morning", SLOT_EVENING = "evening", SLOT_MEAL = "meal";',
    '    public static final String SLOT_MORNING = "morning", SLOT_EVENING = "evening", SLOT_MEAL = "meal", SLOT_WEEKLY = "weekly";',
  ],
  [
    'weekly keys',
    '    public static final String KEY_ANALYSIS_ENABLED = "analysisEnabled";',
    `    public static final String KEY_ANALYSIS_ENABLED = "analysisEnabled";
    public static final String KEY_WEEKLY_ENABLED = "weeklyEnabled";
    public static final String KEY_WEEKLY_DAY = "weeklyDay";
    public static final String KEY_WEEKLY_TIME = "weeklyTime";`,
  ],
  [
    'weekly defaults',
    '    public static final String DEFAULT_MORNING = "07:00", DEFAULT_EVENING = "20:30";',
    `    public static final String DEFAULT_MORNING = "07:00", DEFAULT_EVENING = "20:30", DEFAULT_WEEKLY_TIME = "20:00";
    /** ISO weekday for the weekly review: 7 = Sunday, matching the documented routine. */
    public static final int DEFAULT_WEEKLY_DAY = 7;`,
  ],
  [
    'weekly request code',
    '    public static final int REQUEST_MORNING = 7001, REQUEST_EVENING = 7002, REQUEST_MEAL = 7003;',
    '    public static final int REQUEST_MORNING = 7001, REQUEST_EVENING = 7002, REQUEST_MEAL = 7003, REQUEST_WEEKLY = 7004;',
  ],
  [
    'timeFor handles weekly',
    `    public static String timeFor(Context context, String slot) {
        SharedPreferences p = prefs(context);
        String fallback = SLOT_EVENING.equals(slot) ? DEFAULT_EVENING : DEFAULT_MORNING;
        String value = SLOT_EVENING.equals(slot)
                ? p.getString(KEY_EVENING_TIME, DEFAULT_EVENING)
                : p.getString(KEY_MORNING_TIME, DEFAULT_MORNING);
        return valid(value) ? value : fallback;
    }`,
    `    public static String timeFor(Context context, String slot) {
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
    }`,
  ],
  [
    'scheduleAll includes weekly',
    `    public static void scheduleAll(Context context) {
        scheduleSlot(context, SLOT_MORNING, timeFor(context, SLOT_MORNING));
        scheduleSlot(context, SLOT_EVENING, timeFor(context, SLOT_EVENING));
    }`,
    `    public static void scheduleAll(Context context) {
        scheduleSlot(context, SLOT_MORNING, timeFor(context, SLOT_MORNING));
        scheduleSlot(context, SLOT_EVENING, timeFor(context, SLOT_EVENING));
        if (weeklyEnabled(context)) scheduleAt(context, SLOT_WEEKLY, nextWeeklyTrigger(context));
        else cancelSlot(context, SLOT_WEEKLY);
    }`,
  ],
  [
    'cancelAll includes weekly',
    `            manager.cancel(pending(context, SLOT_MEAL, REQUEST_MEAL));
        }
        edit.remove(KEY_SCHEDULED + SLOT_MORNING).remove(KEY_SCHEDULED + SLOT_EVENING).apply();`,
    `            manager.cancel(pending(context, SLOT_MEAL, REQUEST_MEAL));
            manager.cancel(pending(context, SLOT_WEEKLY, REQUEST_WEEKLY));
        }
        edit.remove(KEY_SCHEDULED + SLOT_MORNING).remove(KEY_SCHEDULED + SLOT_EVENING).remove(KEY_SCHEDULED + SLOT_WEEKLY).apply();`,
  ],
  [
    'scheduleSlot delegates to scheduleAt',
    `    private static void scheduleSlot(Context context, String slot, String hhmm) {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        if (manager == null) return;
        long triggerAt = nextTrigger(hhmm);
        SharedPreferences p = prefs(context);`,
    `    private static void scheduleSlot(Context context, String slot, String hhmm) {
        scheduleAt(context, slot, nextTrigger(hhmm));
    }

    /** Registers one slot at an explicit instant, keeping an existing earlier-or-equal registration. */
    private static void scheduleAt(Context context, String slot, long triggerAt) {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        if (manager == null) return;
        SharedPreferences p = prefs(context);`,
  ],
  [
    'cancelSlot helper',
    `    private static int request(String slot) {
        if (SLOT_EVENING.equals(slot)) return REQUEST_EVENING;`,
    `    private static void cancelSlot(Context context, String slot) {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        if (manager == null) return;
        try { manager.cancel(pending(context, slot, request(slot))); } catch (Exception ignored) { }
        prefs(context).edit().remove(KEY_SCHEDULED + slot).apply();
    }

    private static int request(String slot) {
        if (SLOT_WEEKLY.equals(slot)) return REQUEST_WEEKLY;
        if (SLOT_EVENING.equals(slot)) return REQUEST_EVENING;`,
  ],
  [
    'nextUpcomingTrigger includes weekly',
    `    public static long nextUpcomingTrigger(Context context) {
        long morning = nextTrigger(timeFor(context, SLOT_MORNING));
        long evening = nextTrigger(timeFor(context, SLOT_EVENING));
        return Math.min(morning, evening);
    }`,
    `    public static long nextUpcomingTrigger(Context context) {
        long morning = nextTrigger(timeFor(context, SLOT_MORNING));
        long evening = nextTrigger(timeFor(context, SLOT_EVENING));
        long soonest = Math.min(morning, evening);
        if (weeklyEnabled(context)) soonest = Math.min(soonest, nextWeeklyTrigger(context));
        return soonest;
    }`,
  ],
]);

console.log('weekly slot wired into the scheduler');
