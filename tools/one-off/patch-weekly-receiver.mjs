/*
 * Step 4b (receiver + settings): the weekly slot gets its own prompt built from the last seven days,
 * and the push settings expose the weekly review (enabled + weekday + time).
 */
import fs from 'node:fs';

function patch(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
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

patch('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', [
  [
    'accept the weekly slot',
    '        if (!AlarmScheduler.SLOT_MORNING.equals(slot) && !AlarmScheduler.SLOT_EVENING.equals(slot) && !AlarmScheduler.SLOT_MEAL.equals(slot)) return;',
    '        if (!AlarmScheduler.SLOT_MORNING.equals(slot) && !AlarmScheduler.SLOT_EVENING.equals(slot)\n                && !AlarmScheduler.SLOT_MEAL.equals(slot) && !AlarmScheduler.SLOT_WEEKLY.equals(slot)) return;',
  ],
  [
    'weekly needs a week of data, not today',
    `        DatedData data = readState(context);
        JSONArray meals = data == null ? new JSONArray() : data.mealsOn(today);
        boolean hasData = data != null && data.has(today);`,
    `        DatedData data = readState(context);
        boolean weekly = AlarmScheduler.SLOT_WEEKLY.equals(slot);
        JSONArray meals = data == null ? new JSONArray() : data.mealsOn(today);
        boolean hasData = data != null && data.has(today);
        // A weekly review is worth sending when anything was recorded during the week.
        if (weekly) hasData = data != null && data.hasAnyWithin(today, 7);`,
  ],
  [
    'weekly prompt',
    '                JSONArray messages = analysisMessages(context, today, data, meals, slot);',
    '                JSONArray messages = weekly ? weeklyMessages(context, today, data) : analysisMessages(context, today, data, meals, slot);',
  ],
  [
    'weekly message builder',
    '    private static JSONArray analysisMessages(Context context, String today, DatedData data, JSONArray meals, String slot) throws Exception {',
    `    /**
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
        String system = "你是谨慎的个人健康助手，正在写每周复盘（不是当日建议）。只依据给出的数字，缺失就写未记录，绝不估算填补。"
                + "按这个顺序写：①体重周均值与上周对比（只看周均值，不看单日波动）②本周训练完成次数 ③蛋白质/脂肪/热量达标天数与未达标原因 ④趋势判读（只下趋势性结论，不诊断）⑤下周 1~2 条最小可执行调整。"
                + "body 里的口径是硬约束：摄入不得低于 intakeFloor，缺口不得超过 deficitCapPercent% 的维持热量，蛋白质与脂肪不得低于对应下限。"
                + "涉及份量或热量估算时沿用 body.anchors 里的锚点，宁可略高不要低报。"
                + "通知栏只显示一行：先给最重要的结论与一条调整，其余留到应用内；不要列表符号、不要标题、不要 Markdown、不要换行、不要免责声明。";
        return buildPrompt(system, user);
    }

    private static JSONArray analysisMessages(Context context, String today, DatedData data, JSONArray meals, String slot) throws Exception {`,
  ],
  [
    'weekly data helpers',
    `        boolean has(String day) {`,
    `        /** True when any meal exists within [day - days + 1, day]. */
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

        /** Per-day totals and training flag for the last N days, oldest first. */
        JSONArray weekDays(String day, int days) throws Exception {
            JSONArray out = new JSONArray();
            for (int offset = days - 1; offset >= 0; offset--) {
                String date = java.time.LocalDate.parse(day).minusDays(offset).toString();
                JSONArray rows = mealsOn(date);
                JSONObject entry = new JSONObject().put("date", date).put("mealCount", rows.length());
                double calories = 0, protein = 0, fat = 0, carbs = 0;
                boolean anyNutrition = false;
                for (int i = 0; i < rows.length(); i++) {
                    JSONObject row = rows.optJSONObject(i);
                    if (row == null) continue;
                    Double kcal = finite(row, "calories"), p = finite(row, "protein"), f = finite(row, "fat"), c = finite(row, "carbs");
                    if (kcal != null || p != null || f != null || c != null) anyNutrition = true;
                    calories += kcal == null ? 0 : kcal;
                    protein += p == null ? 0 : p;
                    fat += f == null ? 0 : f;
                    carbs += c == null ? 0 : c;
                }
                if (anyNutrition) entry.put("calories", Math.round(calories)).put("protein", Math.round(protein))
                        .put("fat", Math.round(fat)).put("carbs", Math.round(carbs));
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
            Double kcalFloor = profile == null ? null : finite(profile, "intakeFloor");
            Double kcalMax = profile == null ? null : finite(profile, "trainingDayMax");
            int proteinDays = 0, fatDays = 0, calorieDays = 0, recordedDays = 0;
            for (int offset = 0; offset < days; offset++) {
                String date = java.time.LocalDate.parse(day).minusDays(offset).toString();
                JSONArray rows = mealsOn(date);
                if (rows.length() == 0) continue;
                recordedDays++;
                double calories = 0, protein = 0, fat = 0;
                boolean anyNutrition = false;
                for (int i = 0; i < rows.length(); i++) {
                    JSONObject row = rows.optJSONObject(i);
                    if (row == null) continue;
                    Double kcal = finite(row, "calories"), p = finite(row, "protein"), f = finite(row, "fat");
                    if (kcal != null || p != null || f != null) anyNutrition = true;
                    calories += kcal == null ? 0 : kcal;
                    protein += p == null ? 0 : p;
                    fat += f == null ? 0 : f;
                }
                if (!anyNutrition) continue;
                if (proteinMin != null && protein >= proteinMin) proteinDays++;
                if (fatMin != null && fat >= fatMin) fatDays++;
                if (kcalFloor != null && calories >= kcalFloor && (kcalMax == null || calories <= kcalMax)) calorieDays++;
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

        boolean has(String day) {`,
  ],
]);

console.log('weekly receiver wired');
