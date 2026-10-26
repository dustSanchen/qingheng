/**
 * 每顿按「食品项」保存热量，并让问答能看见每一项。
 *
 *  1. 保存时：任何一条餐食都必须带 items[]。手动记录只填了一个总数时，自动合成一项
 *     （名称 + 该餐总热量/宏量），保证「每条记录都有逐项明细」这一不变量成立。
 *  2. 问答时：numericWindow 给每条餐食附上 items（名称 + 克重 + 热量），按热量取前 8 项，
 *     超出部分标注截断，让模型能点名「这餐里薯条占了 500 kcal」。
 *  3. 提示词：明确告诉模型逐项明细存在，并要求建议落到具体食物上。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'every meal carries per-item nutrition',
    `        if (!time.isEmpty() && !validClock(time)) throw fail("进餐时间格式应为 HH:mm");
        record.remove("needsDate");
    }`,
    `        if (!time.isEmpty() && !validClock(time)) throw fail("进餐时间格式应为 HH:mm");
        // Invariant: every saved meal carries per-food nutrition, so later questions can name the food
        // that contributed the calories instead of only seeing one lump sum.
        record.put("items", cleanMealItems(record));
        record.remove("needsDate");
    }

    /** Rounded per-item rows; a single synthetic item when only totals were supplied. */
    private JSONObject cleanMealItems(JSONObject record) throws Exception {
        JSONArray out = new JSONArray();
        JSONArray items = record.optJSONArray("items");
        if (items != null) {
            for (int i = 0; i < items.length() && out.length() < 100; i++) {
                JSONObject item = items.optJSONObject(i);
                if (item == null) continue;
                String name = optionalText(item, "name").trim();
                if (name.isEmpty()) continue;
                JSONObject clean = new JSONObject().put("name", name.length() > 200 ? name.substring(0, 200) : name);
                for (String key : new String[]{"grams", "calories", "protein", "carbs", "fat"}) {
                    Double value = finite(item, key);
                    clean.put(key, value == null ? 0 : Math.round(value * 10) / 10.0);
                }
                out.put(clean);
            }
        }
        if (out.length() == 0) {
            // Manual entries have one name and one set of totals; keep that as a single item row so the
            // shape is uniform (and the question "which food was the calories" still has an answer).
            JSONObject totals = record.optJSONObject("totals");
            JSONObject single = new JSONObject().put("name", optionalText(record, "name").trim().isEmpty()
                    ? optionalText(record, "mealType").trim() + "（未拆分）" : optionalText(record, "name").trim());
            Double grams = finite(record, "grams");
            for (String key : new String[]{"calories", "protein", "carbs", "fat"}) {
                Double value = finite(record, key);
                if (value == null && totals != null) value = finite(totals, key);
                single.put(key, value == null ? 0 : Math.round(value * 10) / 10.0);
            }
            single.put("grams", grams == null ? 0 : Math.round(grams * 10) / 10.0);
            out.put(single);
        }
        return out;
    }`,
  ],
  [
    'the question window carries each meal items',
    `            JSONObject totals = record.optJSONObject("totals");
            if (totals != null) row.put("totals", numericFields(totals));
            JSONObject direct = numericFields(record);
            if (direct.length() > 0) row.put("macros", direct);`,
    `            JSONObject totals = record.optJSONObject("totals");
            if (totals != null) row.put("totals", numericFields(totals));
            JSONObject direct = numericFields(record);
            if (direct.length() > 0) row.put("macros", direct);
            // Per-food rows, biggest contributor first: this is what lets an answer name a food.
            if ("meals".equals(collection)) {
                JSONArray itemRows = mealItemsForPrompt(record);
                if (itemRows.length() > 0) row.put("items", itemRows);
            }`,
  ],
  [
    'the helper that compacts items for the model',
    `    private static String safeMealType(JSONObject record) {`,
    `    /** Name + grams + calories per food, capped at eight rows so the payload stays small. */
    private static JSONArray mealItemsForPrompt(JSONObject record) throws Exception {
        JSONArray items = record.optJSONArray("items");
        if (items == null || items.length() == 0) return new JSONArray();
        List<JSONObject> rows = new ArrayList<>();
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            String name = optionalText(item, "name").trim();
            if (name.isEmpty()) continue;
            JSONObject row = new JSONObject().put("name", name.length() > 60 ? name.substring(0, 60) : name);
            Double grams = finite(item, "grams"), kcal = finite(item, "calories");
            if (grams != null) row.put("grams", Math.round(grams));
            row.put("kcal", kcal == null ? 0 : Math.round(kcal));
            rows.add(row);
        }
        if (rows.isEmpty()) return new JSONArray();
        rows.sort((a, b) -> Double.compare(b.optDouble("kcal", 0), a.optDouble("kcal", 0)));
        JSONArray out = new JSONArray();
        for (int i = 0; i < rows.size() && i < 8; i++) out.put(rows.get(i));
        if (rows.size() > 8) out.put(new JSONObject().put("name", "（另有 " + (rows.size() - 8) + " 项未列出）").put("kcal", 0));
        return out;
    }

    private static String safeMealType(JSONObject record) {`,
  ],
]);

patch('app/src/main/java/cn/qingheng/health/ai/Prompts.java', [
  [
    'the prompt says per-food detail exists',
    `                + "食物建议写明大致份量，但不要声称份量是精确测量。"`,
    `                + "食物建议写明大致份量，但不要声称份量是精确测量。"
                + "meals 中每条带 items（name/grams/kcal，已按热量从高到低排序，最多 8 项）；"
                + "谈某餐的热量构成时必须点名到具体食物（例如「这餐 1040 kcal 里薯条占 500」），"
                + "不要只说「这餐偏高」；items 缺失时才退回按整餐描述。"`,
  ],
]);

// 导出 Markdown 也给逐项明细，便于核对
patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'markdown export lists the items',
    `                    .append(" g · 碳水 ").append(mdNumber(meal.opt("carbs"))).append(" g\\n");`,
    `                    .append(" g · 碳水 ").append(mdNumber(meal.opt("carbs"))).append(" g\\n");
            JSONArray items = meal.optJSONArray("items");
            if (items != null) {
                for (int j = 0; j < items.length() && j < 12; j++) {
                    JSONObject item = items.optJSONObject(j);
                    if (item == null) continue;
                    md.append("  - ").append(cell(optionalText(item, "name")))
                            .append("：").append(mdNumber(item.opt("calories"))).append(" kcal\\n");
                }
            }`,
  ],
]);

console.log('per-item nutrition wired');
