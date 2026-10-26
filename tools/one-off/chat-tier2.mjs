/**
 * P2-8 模型路由：fast 档 = 不联网 + 简短指令 + 精简上下文（只给近 3 天）。
 * 修正了上一版锚点（声明是 private String）。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'fast tier: no web search, short answer',
    "        // Lookup runs before the model call. The note goes right before the user turn so it outranks older history.\n        boolean wantWeb = b.optBoolean(\"webSearch\", false) && !question.isEmpty();",
    "        // Tier decides cost: a fast answer is short, never searches the web, and skips the deep context.\n        boolean fastTier = \"fast\".equals(b.optString(\"tier\", \"deep\"));\n        if (fastTier) {\n            messages.put(new JSONObject().put(\"role\", \"system\").put(\"content\",\n                    \"本次是快速回答：最多 3 句，先给结论再给一个动作，不要复述数据，不解释推理过程。\"));\n        }\n        // Lookup runs before the model call. The note goes right before the user turn so it outranks older history.\n        boolean wantWeb = !fastTier && b.optBoolean(\"webSearch\", false) && !question.isEmpty();",
  ],
  [
    'the context is trimmed for a fast answer',
    "        messages.put(new JSONObject().put(\"role\", \"system\").put(\"content\", chatDataContext(selectedDate)));",
    "        messages.put(new JSONObject().put(\"role\", \"system\").put(\"content\", fastTier ? chatDataContextCompact(selectedDate) : chatDataContext(selectedDate)));",
  ],
  [
    'a compact context builder',
    "    private String chatDataContext(String selectedDate) throws Exception {",
    `    /** Only what a short answer needs: today's totals, ranges and the last three days. */
    private String chatDataContextCompact(String selectedDate) throws Exception {
        JSONObject context = new JSONObject().put("today", dayOffset(0)).put("selectedDate", selectedDate);
        JSONObject profile = effectiveProfile(selectedDate);
        String goal = optionalText(profile, "goal").trim();
        if (!goal.isEmpty()) context.put("goal", goal).put("goalLabel", goalText(profile));
        JSONObject targets = new JSONObject();
        for (String key : new String[]{"proteinMin", "proteinMax", "fatMin", "fatMax", "calorieTarget",
                "intakeFloor", "trainingDayMin", "trainingDayMax", "restDayMin", "restDayMax", "training"}) {
            Double value = finite(profile, key);
            if (value != null) targets.put(key, value);
        }
        targets.put("trainedOnSelectedDate", trainedOn(selectedDate));
        String from = dayOffsetFrom(selectedDate, -2);
        context.put("profileTargets", targets).put("window", from + ".." + selectedDate)
                .put("mealCount", mealCount(selectedDate))
                .put("dailyNutrition", dailyNutrition(from, selectedDate))
                .put("recordPolicy", "快速回答模式：只给了最近三天，缺数据就说缺失，不要推测。");
        return context.toString();
    }

    private String chatDataContext(String selectedDate) throws Exception {`,
  ],
]);

console.log('fast tier wired (v2)');
