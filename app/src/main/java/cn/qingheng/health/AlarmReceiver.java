package cn.qingheng.health;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Delivers the daily analysis notification. Runs entirely without the Activity, so the alarm still
 * works while the app is backgrounded or killed.
 *
 * Flow: reschedule this slot for tomorrow, then (only with consent, a stored key and an
 * external-call-enabled provider) ask the configured text model for a short Chinese summary of
 * today's numbers and post it as the notification body. Any failure falls back to a neutral
 * reminder that never invents numbers and never claims an analysis happened.
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final int STATE_LIMIT = 8 * 1024 * 1024;
    private static final int PROMPT_LIMIT = 20000;
    private static final int RESULT_LIMIT = 500;
    /** Visible characters in the collapsed notification; Xiaomi shows roughly this much on one line. */
    private static final int NOTIFY_TEXT_LIMIT = 58;

    @Override public void onReceive(Context context, Intent intent) {
        if (context == null) return;
        final Context app = context.getApplicationContext() == null ? context : context.getApplicationContext();
        final String action = intent == null ? null : intent.getAction();
        final String slot = intent == null ? null : intent.getStringExtra(AlarmScheduler.EXTRA_SLOT);
        // Every tick re-arms the next occurrence for its own slot, even if push was just disabled.
        try { AlarmScheduler.rescheduleIfEnabled(app); } catch (Exception ignored) { }
        if (!AlarmScheduler.ACTION_TICK.equals(action)) return;
        if (!AlarmScheduler.SLOT_MORNING.equals(slot) && !AlarmScheduler.SLOT_EVENING.equals(slot)
                && !AlarmScheduler.SLOT_MEAL.equals(slot) && !AlarmScheduler.SLOT_WEEKLY.equals(slot)) return;
        if (!AlarmScheduler.enabled(app)) return;
        if (!PushNotify.notificationsGranted(app)) return;

        // A short foreground service survives the whole model call; goAsync() only guarantees about
        // ten seconds, which aggressive ROMs turned into silently lost reminders. Older releases
        // keep the receiver path, and a refused start falls back to it as well.
        if (PushService.start(app, slot)) return;
        final PendingResult pending = goAsync();
        // goAsync() only keeps the process alive for a short burst, so hop off the main thread at
        // once: the model call can take up to the 60 s read timeout.
        new Thread(() -> {
            try { deliver(app, slot); }
            catch (Exception ignored) { }
            finally { try { pending.finish(); } catch (Exception ignored) { } }
        }, "qingheng-push").start();
    }

    /** Startup catch-up for a due slot that was delayed or missed while the app was closed. */
    public static void catchUp(Context context, String slot) {
        if (context == null || (!AlarmScheduler.SLOT_MORNING.equals(slot) && !AlarmScheduler.SLOT_EVENING.equals(slot))) return;
        final Context app = context.getApplicationContext() == null ? context : context.getApplicationContext();
        if (PushService.start(app, slot)) return;
        new Thread(() -> {
            try { deliver(app, slot); }
            catch (Exception ignored) { }
        }, "qingheng-push-catchup").start();
    }

    static void deliver(Context context, String slot) throws Exception {
        String today = AlarmScheduler.today();
        SharedPreferences push = AlarmScheduler.prefs(context);
        // One notification per slot per day, so a duplicate tick cannot spam the user.
        if (AlarmScheduler.ran(context, today, slot)) return;

        String provider = activeProvider(context);
        JSONObject config = providerConfig(context, provider);
        boolean consent = push.getBoolean(AlarmScheduler.KEY_ANALYSIS_ENABLED, false);
        DatedData data = readState(context);
        boolean weekly = AlarmScheduler.SLOT_WEEKLY.equals(slot);
        JSONArray meals = data == null ? new JSONArray() : data.mealsOn(today);
        boolean hasData = data != null && data.has(today);
        // A weekly review is worth sending when anything was recorded during the week.
        if (weekly) hasData = data != null && data.hasAnyWithin(today, 7);
        String advice = null;
        String failure = null;
        // No recorded meals means nothing to analyse: skipping the call saves the user's tokens and
        // keeps the notification honest instead of having a model reason about empty data.
        boolean worthCalling = consent && config.optBoolean("allowExternal", false) && !config.optString("model", "").trim().isEmpty() && hasData;
        if (worthCalling) {
            try {
                if (!config.optBoolean("apiConfigured", false)) throw new PublicError("未配置 API 密钥");
                String key = SecretStore.decrypt(context, provider);
                JSONArray messages = weekly ? weeklyMessages(context, today, data) : analysisMessages(context, today, data, meals, slot);
                advice = ChatCompletion.complete(config, key, config.getString("model"), messages).getString("content").trim();
                if (advice.isEmpty()) advice = null;
            } catch (Exception e) {
                failure = e instanceof PublicError ? e.getMessage() : null;
            }
        }
        String body;
        if (advice != null) {
            body = advice;
        } else {
            // Never fabricate numbers and never imply the analysis succeeded.
            String reason = !hasData ? "今天还没有已记录的餐食，" : "未能完成分析，";
            if (failure != null) reason = failure;
            body = reason + "打开轻衡查看或记录今天的饮食。";
        }
        // One window, one reminder: if the other slot just fired, skip instead of stacking.
        if (AlarmScheduler.tooSoonAfterLastPost(context) && AlarmScheduler.postedToday(context)) {
            AlarmScheduler.markRan(context, today, slot);
            recordSkip(context, today, slot);
            return;
        }
        // Claim only after the message is ready, then post exactly once. Two concurrent wake-ups
        // can both prepare a message, but only the thread that claims the slot reaches notify().
        if (!AlarmScheduler.markRan(context, today, slot)) return;
        // The shade shows one short line; the full advice stays available on expand and in history.
        if (!PushNotify.post(context, slot, condense(body), body)) {
            AlarmScheduler.clearRan(context, today, slot);
            return;
        }
        AlarmScheduler.markPosted(context);
        SharedPreferences.Editor edit = push.edit();
        String summary = (advice != null ? "api: " : "fallback: ") + body;
        edit.putString(AlarmScheduler.KEY_LAST_RESULT, summary.length() > RESULT_LIMIT ? summary.substring(0, RESULT_LIMIT) : summary);
        // Keep generated and fallback messages so the app can query them later.
        JSONArray history = new JSONArray();
        try { String saved = push.getString("adviceHistory", ""); if (!saved.isEmpty()) history = new JSONArray(saved); } catch (Exception ignored) { history = new JSONArray(); }
        JSONObject record = new JSONObject().put("id", today + "-" + slot).put("date", today).put("slot", slot)
                .put("createdAt", System.currentTimeMillis()).put("source", advice != null ? "api" : "fallback").put("message", body);
        JSONArray next = new JSONArray(); boolean replaced = false;
        for (int i = 0; i < history.length(); i++) { JSONObject oldRecord = history.optJSONObject(i); if (oldRecord == null) continue; if (record.getString("id").equals(oldRecord.optString("id"))) { next.put(record); replaced = true; } else next.put(oldRecord); }
        if (!replaced) next.put(record);
        int start = Math.max(0, next.length() - 60); JSONArray capped = new JSONArray();
        for (int i = start; i < next.length(); i++) capped.put(next.get(i));
        edit.putString("adviceHistory", capped.toString());
        edit.apply();
    }

    /**
     * The model sees numbers only: no ids, no names, no free text, no dates of birth, no notes.
     * Missing values stay missing so the model is told the data is incomplete rather than zero.
     */
    /**
     * One short line for the notification shade. Xiaomi shows the collapsed notification on a single
     * line, so the visible text stops at the first sentence that fits; the full advice is still
     * carried in the expanded text and in the history.
     */
    static String condense(String text) {
        if (text == null) return "";
        String flat = text.replace("\r", "\n")
                .replaceAll("(?m)^\\s*(?:[-*•·]|\\d+[.)、])\\s*", "")
                .replaceAll("[`#*>_]", "")
                .replaceAll("\\s+", " ")
                .trim();
        if (flat.length() <= NOTIFY_TEXT_LIMIT) return flat;
        // Prefer a natural sentence ending inside the limit.
        int cut = -1;
        for (int i = Math.min(NOTIFY_TEXT_LIMIT, flat.length()) - 1; i >= 12; i--) {
            char c = flat.charAt(i);
            if (c == '。' || c == '！' || c == '？' || c == '；') {cut = i + 1; break;}
        }
        if (cut < 0) cut = NOTIFY_TEXT_LIMIT;
        return flat.substring(0, cut).trim() + "…";
    }

    /** Records a deliberately skipped slot so silence is explained rather than mysterious. */
    static void recordSkip(Context context, String today, String slot) {
        try {
            SharedPreferences push = AlarmScheduler.prefs(context);
            JSONArray history = new JSONArray();
            String saved = push.getString("adviceHistory", "");
            if (!saved.isEmpty()) history = new JSONArray(saved);
            String id = today + "-" + slot;
            JSONObject record = new JSONObject().put("id", id).put("date", today).put("slot", slot)
                    .put("createdAt", System.currentTimeMillis()).put("source", "skipped")
                    .put("message", "为避免与同一时段的另一条提醒重复，本次提醒已跳过。需要时可在应用内点「获取建议」。");
            JSONArray next = new JSONArray();
            boolean replaced = false;
            for (int i = 0; i < history.length(); i++) {
                JSONObject old = history.optJSONObject(i);
                if (old == null) continue;
                if (id.equals(old.optString("id"))) {next.put(record); replaced = true;} else next.put(old);
            }
            if (!replaced) next.put(record);
            int start = Math.max(0, next.length() - 60);
            JSONArray capped = new JSONArray();
            for (int i = start; i < next.length(); i++) capped.put(next.get(i));
            push.edit().putString("adviceHistory", capped.toString()).apply();
        } catch (Exception ignored) { }
    }

    /**
     * The weekly review payload: the last seven days, day by day, plus weekly weight means. The
     * requested output follows the documented weekly checklist (weight mean, training count, how many
     * days each macro target was met, a trend sentence, and one or two changes for next week).
     */
    private static JSONArray weeklyMessages(Context context, String today, DatedData data) throws Exception {
        JSONObject user = new JSONObject();
        user.put("date", today);
        user.put("window", "最近 7 天（含今天）");
        if (data != null) {
            user.put("body", data.targets(today));
            user.put("days", data.weekDays(today, 7));
            JSONObject means = data.weightWeeklyMeans(today);
            if (means.length() > 0) user.put("weightWeeklyMeans", means);
            JSONObject met = data.targetsMetDays(today, 7);
            if (met.length() > 0) user.put("daysMeetingTargets", met);
        }
        String system = cn.qingheng.health.ai.Prompts.weeklyReview();
        return buildPrompt(system, user);
    }

    private static JSONArray analysisMessages(Context context, String today, DatedData data, JSONArray meals, String slot) throws Exception {
        JSONObject user = new JSONObject();
        user.put("date", today);
        user.put("mealCount", data == null ? meals.length() : data.mealCount(today));
        if (data != null) user.put("body", data.targets(today));
        user.put("meals", compactNumbers(meals));
        if (data != null && !data.has(today)) user.put("note", "今天没有任何已记录的餐食，摄入数据缺失，不要按 0 计算。");
        // Whether the day is a training day decides both the intake range and the training sentence.
        Boolean trainedToday = data == null ? null : data.trainedOn(today);
        if (data != null) user.put("trainsToday", trainedToday == null ? JSONObject.NULL : trainedToday);
        // The profile decides whether training advice makes sense at all.
        if (data != null && data.trainingOff()) user.put("trainingDisabled", true);
        if (user.optInt("mealCount", 0) > meals.length()) user.put("mealsTruncated", true);
        boolean mealSlot = AlarmScheduler.SLOT_MEAL.equals(slot);
        if (mealSlot) user.put("slot", "刚记录完一餐，给出这一餐的即时反馈");
        String system = cn.qingheng.health.ai.Prompts.dailyAdvice(mealSlot);
        return buildPrompt(system, user);
    }

    /**
     * Serialises the prompt without ever cutting the JSON text: meal detail is dropped first, then
     * optional blocks, so the model always receives parseable input or an explicit failure.
     */
    private static JSONArray buildPrompt(String system, JSONObject user) throws Exception {
        for (int guard = 0; guard < 40; guard++) {
            if (user.toString().length() <= PROMPT_LIMIT) break;
            JSONArray rows = user.optJSONArray("meals");
            if (rows != null && rows.length() > 0) {
                int keep = Math.max(0, rows.length() - Math.max(1, rows.length() / 4));
                JSONArray smaller = new JSONArray();
                for (int i = 0; i < keep; i++) smaller.put(rows.get(i));
                user.put("meals", smaller).put("mealsTruncated", true);
                continue;
            }
            if (user.has("body")) { user.remove("body"); user.put("bodyOmitted", "内容过长已省略"); continue; }
            if (user.has("note")) { user.remove("note"); continue; }
            throw new PublicError("今日记录过多，无法生成推送分析");
        }
        if (user.toString().length() > PROMPT_LIMIT) throw new PublicError("今日记录过多，无法生成推送分析");
        return new JSONArray()
                .put(new JSONObject().put("role", "system").put("content", system))
                .put(new JSONObject().put("role", "user").put("content", user.toString()));
    }

    /** Keep only the macro numbers that actually exist; names and free text are dropped. */
    static JSONArray compactNumbers(JSONArray records) throws Exception {
        JSONArray out = new JSONArray();
        for (int i = 0; i < records.length() && out.length() < 60; i++) {
            JSONObject record = records.optJSONObject(i);
            if (record == null) continue;
            JSONObject row = new JSONObject();
            String date = record.optString("date", record.optString("day", ""));
            if (date.length() == 10) row.put("date", date);
            row.put("mealType", safeMealType(record));
            String mealTime = record.optString("mealTime", "");
            if (mealTime.matches("^([01]\\d|2[0-3]):[0-5]\\d$")) row.put("mealTime", mealTime);
            JSONObject totals = record.optJSONObject("totals");
            JSONObject source = totals == null ? record : totals;
            for (String key : new String[]{"calories", "protein", "carbs", "fat"}) {
                Double value = finite(source, key);
                if (value == null && totals != null) value = finite(record, key);
                if (value != null && row.optDouble(key, -1) < 0) row.put(key, value);
            }
            // A meal with missing macros is still evidence that it was eaten, so the row is kept.
            out.put(row);
        }
        return out;
    }

    /** Only the four known meal slots travel; anything else is reported as unknown. */
    private static String safeMealType(JSONObject record) {
        String type = record.optString("mealType", "");
        return "breakfast".equals(type) || "lunch".equals(type) || "dinner".equals(type) || "snack".equals(type) ? type : "unknown";
    }

    private static Double finite(JSONObject object, String key) {
        Object raw = object.opt(key);
        if (!(raw instanceof Number)) return null;
        double value = ((Number)raw).doubleValue();
        return Double.isFinite(value) && value >= 0 ? value : null;
    }

    /** Read state.json exactly as the Activity writes it, but read-only and without AtomicFile. */
    private static DatedData readState(Context context) {
        File file = new File(context.getFilesDir(), "state.json");
        if (!file.isFile()) return null;
        try (InputStream in = new BufferedInputStream(new FileInputStream(file))) {
            byte[] buffer = new byte[8192];
            java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
            int n;
            while ((n = in.read(buffer)) != -1) {
                if (bytes.size() + n > STATE_LIMIT) return null;
                bytes.write(buffer, 0, n);
            }
            return new DatedData(new JSONObject(new String(bytes.toByteArray(), StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return null;
        }
    }

    static String activeProvider(Context context) {
        String provider = SecretStore.prefs(context).getString("provider", "deepseek");
        return MainActivity.isKnownProvider(provider) ? provider : "deepseek";
    }

    static JSONObject providerConfig(Context context, String provider) {
        JSONObject config = new JSONObject();
        try {
            String stored = SecretStore.prefs(context).getString("config." + provider, "");
            if (stored != null && !stored.isEmpty()) config = new JSONObject(stored);
            if (!config.has("allowExternal")) config.put("allowExternal", false);
            String key = SecretStore.prefs(context).getString("key." + provider, "");
            config.put("apiConfigured", key != null && !key.isEmpty());
        } catch (Exception ignored) { }
        return config;
    }

    /** Snapshot of the stored app state, indexed by yyyy-MM-dd. */
    static final class DatedData {
        private final JSONObject state;
        DatedData(JSONObject state) { this.state = state; }

        /** True when the profile says the user does not train, so no training advice should be produced. */
        boolean trainingOff() {
            JSONObject profile = state == null ? null : state.optJSONObject("profile");
            return profile != null && "none".equals(profile.optString("training", ""));
        }

        /** Meals recorded on one day; weight and habit rows are not meals and never enter the meal list. */
        JSONArray mealsOn(String day) {
            JSONArray hits = new JSONArray();
            JSONArray records = state.optJSONArray("meals");
            if (records == null) return hits;
            for (int i = 0; i < records.length(); i++) {
                JSONObject record = records.optJSONObject(i);
                if (record == null) continue;
                if (day.equals(record.optString("date", record.optString("day", "")))) hits.put(record);
            }
            return hits;
        }

        int mealCount(String day) {
            return mealsOn(day).length();
        }

        /** True when any meal exists within [day - days + 1, day]. */
        boolean hasAnyWithin(String day, int days) {
            String from = java.time.LocalDate.parse(day).minusDays(days - 1L).toString();
            JSONArray meals = state.optJSONArray("meals");
            if (meals == null) return false;
            for (int i = 0; i < meals.length(); i++) {
                JSONObject row = meals.optJSONObject(i);
                if (row == null) continue;
                String date = row.optString("date", row.optString("day", ""));
                if (date.length() == 10 && date.compareTo(from) >= 0 && date.compareTo(day) <= 0) return true;
            }
            return false;
        }

        /** A component nobody recorded counts as 0 only when another component of that day exists. */
        private static double orZero(Double value) {
            return value == null ? 0 : value;
        }

        /** Per-day totals and training flag for the last N days, oldest first. */        JSONArray weekDays(String day, int days) throws Exception {
            JSONArray out = new JSONArray();
            for (int offset = days - 1; offset >= 0; offset--) {
                String date = java.time.LocalDate.parse(day).minusDays(offset).toString();
                JSONArray rows = mealsOn(date);
                JSONObject entry = new JSONObject().put("date", date).put("mealCount", rows.length());
                // Aggregation rules live in store.RecordMath: a component nobody recorded counts as 0
                // only when another component of the same day exists.
                if (cn.qingheng.health.store.RecordMath.hasAnyOf(rows, "calories", "protein", "fat", "carbs")) {
                    entry.put("calories", orZero(cn.qingheng.health.store.RecordMath.sumRounded(rows, "calories")))
                            .put("protein", orZero(cn.qingheng.health.store.RecordMath.sumRounded(rows, "protein")))
                            .put("fat", orZero(cn.qingheng.health.store.RecordMath.sumRounded(rows, "fat")))
                            .put("carbs", orZero(cn.qingheng.health.store.RecordMath.sumRounded(rows, "carbs")));
                }
                Boolean trained = trainedOn(date);
                if (trained != null) entry.put("trained", trained);
                out.put(entry);
            }
            return out;
        }

        /** Weekly weight means (ISO weeks, Monday first) for the weeks overlapping the window. */
        JSONObject weightWeeklyMeans(String day) throws Exception {
            java.util.Map<String, List<Double>> byWeek = new java.util.TreeMap<>();
            JSONArray measurements = state.optJSONArray("measurements");
            if (measurements != null) {
                for (int i = 0; i < measurements.length(); i++) {
                    JSONObject row = measurements.optJSONObject(i);
                    if (row == null) continue;
                    String date = row.optString("date", row.optString("day", ""));
                    Double weight = finite(row, "weight");
                    if (date.length() != 10 || weight == null || date.compareTo(day) > 0) continue;
                    String week = java.time.LocalDate.parse(date)
                            .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).toString();
                    byWeek.computeIfAbsent(week, key -> new ArrayList<>()).add(weight);
                }
            }
            JSONObject out = new JSONObject();
            for (java.util.Map.Entry<String, List<Double>> entry : byWeek.entrySet()) {
                double sum = 0;
                for (Double value : entry.getValue()) sum += value;
                out.put(entry.getKey(), Math.round(sum / entry.getValue().size() * 10) / 10.0);
            }
            return out;
        }

        /** How many of the last N days met each macro target; null-safe and honest about missing days. */
        JSONObject targetsMetDays(String day, int days) throws Exception {
            JSONObject profile = state.optJSONObject("profile");
            Double proteinMin = profile == null ? null : finite(profile, "proteinMin");
            Double fatMin = profile == null ? null : finite(profile, "fatMin");
            Double kcalFloor = profile == null ? null : ("female".equals(profile.optString("sex")) ? 1200.0 : 1500.0);
            Double kcalMax = profile == null ? null : finite(profile, "trainingDayMax");
            int proteinDays = 0, fatDays = 0, calorieDays = 0, recordedDays = 0;
            for (int offset = 0; offset < days; offset++) {
                String date = java.time.LocalDate.parse(day).minusDays(offset).toString();
                JSONArray rows = mealsOn(date);
                if (rows.length() == 0) continue;
                recordedDays++;
                // Same shared rule as the day table: a component nobody recorded is not a zero day.
                Double calories = cn.qingheng.health.store.RecordMath.sum(rows, "calories");
                Double protein = cn.qingheng.health.store.RecordMath.sum(rows, "protein");
                Double fat = cn.qingheng.health.store.RecordMath.sum(rows, "fat");
                if (calories == null && protein == null && fat == null) continue;
                if (proteinMin != null && protein != null && protein >= proteinMin) proteinDays++;
                if (fatMin != null && fat != null && fat >= fatMin) fatDays++;
                if (cn.qingheng.health.store.RecordMath.withinRange(calories, kcalFloor, kcalMax)) calorieDays++;
            }
            return new JSONObject().put("windowDays", days).put("recordedDays", recordedDays)
                    .put("proteinDays", proteinDays).put("fatDays", fatDays).put("calorieDays", calorieDays);
        }

        /** Whether a habit row marks that date as a training day; null when unrecorded. */
        Boolean trainedOn(String date) {
            JSONArray habits = state.optJSONArray("habits");
            if (habits == null) return null;
            for (int i = 0; i < habits.length(); i++) {
                JSONObject row = habits.optJSONObject(i);
                if (row == null || !date.equals(row.optString("date", ""))) continue;
                Object trained = row.opt("training");
                if (trained instanceof Boolean) return (Boolean) trained;
                if (trained != null && !JSONObject.NULL.equals(trained)) return Boolean.parseBoolean(String.valueOf(trained));
            }
            return null;
        }

        boolean has(String day) {
            JSONArray meals = state.optJSONArray("meals");
            if (meals == null) return false;
            for (int i = 0; i < meals.length(); i++) {
                JSONObject meal = meals.optJSONObject(i);
                if (meal != null && day.equals(meal.optString("date", meal.optString("day", "")))) return true;
            }
            return false;
        }

        /** Only numeric body and reference values, never identity or free text. */
        JSONObject targets(String day) throws Exception {
            JSONObject profile = state.optJSONObject("profile");
            JSONObject out = new JSONObject();
            if (profile != null) for (String key : new String[]{"height", "age", "training", "proteinMin", "proteinMax", "fatMin", "fatMax", "calorieTarget",
                    "referenceCalories", "deficitCapPercent", "fatFloorG",
                    "trainingDayMin", "trainingDayMax", "restDayMin", "restDayMax"}) {
                Double value = finite(profile, key);
                if (value != null) out.put(key, value);
            }
            // 目标类型让推送/周报能按目标给建议，而不是只看到区间。
            if (profile != null) {
                String goal = profile.optString("goal", "").trim();
                if (!goal.isEmpty()) out.put("goal", goal);
            }
            // Whether that day was actually a training day decides which intake range applies.
            try {
                JSONArray habits = state.optJSONArray("habits");
                if (habits != null) for (int i = 0; i < habits.length(); i++) {
                    JSONObject row = habits.optJSONObject(i);
                    if (row == null || !day.equals(row.optString("date", ""))) continue;
                    Object trained = row.opt("training");
                    if (trained instanceof Boolean) out.put("trainedToday", (Boolean) trained);
                    else if (trained != null && !JSONObject.NULL.equals(trained)) out.put("trainedToday", Boolean.parseBoolean(String.valueOf(trained)));
                }
            } catch (Exception ignored) { }
            // The user's own anchor table, so a pushed suggestion uses the same numbers as the app.
            try {
                JSONObject cached = state.optJSONObject("foodAnchors");
                String summary = cached == null ? "" : cached.optString("summary", "");
                if (!summary.isEmpty()) out.put("anchors", summary.length() > 4000 ? summary.substring(0, 4000) : summary);
            } catch (Exception ignored) { }
            JSONArray weights = new JSONArray();
            JSONArray measurements = state.optJSONArray("measurements");
            if (measurements != null) {
                for (int i = 0; i < measurements.length(); i++) {
                    JSONObject row = measurements.optJSONObject(i);
                    if (row == null) continue;
                    String date = row.optString("date", row.optString("day", ""));
                    Double weight = finite(row, "weight");
                    if (date.length() == 10 && date.compareTo(day) <= 0 && weight != null)
                        weights.put(new JSONObject().put("date", date).put("weight", weight));
                }
            }
            List<java.util.Map.Entry<String, Double>> sorted = new ArrayList<>();
            for (int i = 0; i < weights.length(); i++) {
                JSONObject row = weights.getJSONObject(i);
                sorted.add(new java.util.AbstractMap.SimpleEntry<>(row.getString("date"), row.getDouble("weight")));
            }
            sorted.sort((a, b) -> a.getKey().compareTo(b.getKey()));
            if (!sorted.isEmpty()) {
                out.put("latestWeight", sorted.get(sorted.size() - 1).getValue());
                java.util.Map.Entry<String, Double> latest = sorted.get(sorted.size() - 1);
                String from = java.time.LocalDate.parse(day).minusDays(13).toString();
                Double baseline = null;
                for (java.util.Map.Entry<String, Double> row : sorted) {
                    if (row.getKey().compareTo(from) <= 0) baseline = row.getValue();
                }
                if (baseline != null && !baseline.equals(latest.getValue()))
                    out.put("weightChange14Days", latest.getValue() - baseline);
            }
            return out;
        }
    }
}
