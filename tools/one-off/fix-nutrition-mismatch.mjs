/**
 * 修复「API 营养总量与明细不一致」：
 *
 * 统一的规则是 totals = 明细合计 + 用油。之前三层各用一套规则：
 *  - 模型把油算进了 totals（提示词要求的）；
 *  - 原生校验拿「明细合计」跟 totals 比 → 只要炒菜就必然不一致，直接抛错、整次估算作废；
 *  - 预览与保存又只用「明细合计」，于是油在界面上写着「已计入」但数字里没有。
 *
 * 现在：原生统一按「明细 + 油」算出总量；模型总量与它不符时只记一条说明，不再失败；
 * 预览与保存也用同一个口径。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  [
    'oil first, then one canonical total',
    `        JSONObject cleanTotals = new JSONObject();
        for (String k : new String[]{"calories", "protein", "carbs", "fat"}) {
            double supplied = number(totals, k), sum = 0;
            for (int i = 0; i < items.length(); i++) sum += items.getJSONObject(i).getDouble(k);
            if (Math.abs(sum - supplied) > Math.max(2, sum * 0.1)) throw fail("API 营养总量与明细不一致，请重新估算");
            cleanTotals.put(k, sum);
        }
        Object notes = parsed.opt("notes");
        if (!(notes instanceof String) || ((String)notes).length() > 4000) throw fail("API 备注格式不正确");
        // Cooking oil is reported separately so editing it later recalculates instead of double-counting.
        // It must already be inside totals; a missing or zero value is kept as 0 and stays explicit.
        double oilGrams = 0;
        if (parsed.has("oilGrams") && !parsed.isNull("oilGrams")) oilGrams = number(parsed, "oilGrams");
        if (oilGrams > 500) throw fail("API 用油量超出合理范围");`,
    `        Object notes = parsed.opt("notes");
        if (!(notes instanceof String) || ((String)notes).length() > 4000) throw fail("API 备注格式不正确");
        // Oil is read first, because it is part of the meal's totals and must not look like a mismatch.
        double oilGrams = 0;
        if (parsed.has("oilGrams") && !parsed.isNull("oilGrams")) oilGrams = number(parsed, "oilGrams");
        if (oilGrams > 500) throw fail("API 用油量超出合理范围");
        // One canonical total: the line items plus the cooking oil. The model's own totals are only
        // checked for agreement; a disagreement becomes a note instead of throwing the call away.
        double[][] itemValues = new double[items.length()][cn.qingheng.health.store.NutritionMath.FIELDS];
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.getJSONObject(i);
            Double kcal = finite(item, "calories"), protein = finite(item, "protein");
            Double carbs = finite(item, "carbs"), fat = finite(item, "fat");
            itemValues[i][cn.qingheng.health.store.NutritionMath.CALORIES] = kcal == null ? 0 : kcal;
            itemValues[i][cn.qingheng.health.store.NutritionMath.PROTEIN] = protein == null ? 0 : protein;
            itemValues[i][cn.qingheng.health.store.NutritionMath.CARBS] = carbs == null ? 0 : carbs;
            itemValues[i][cn.qingheng.health.store.NutritionMath.FAT] = fat == null ? 0 : fat;
        }
        double[] derived = cn.qingheng.health.store.NutritionMath.totals(itemValues, oilGrams);
        String[] keys = {"calories", "protein", "carbs", "fat"};
        boolean mismatch = false;
        for (int i = 0; i < keys.length; i++) {
            Double supplied = finite(totals, keys[i]);
            if (supplied != null && cn.qingheng.health.store.NutritionMath.differs(supplied, derived[i])) mismatch = true;
        }
        double[] stored = cn.qingheng.health.store.NutritionMath.rounded(derived);
        JSONObject cleanTotals = new JSONObject();
        for (int i = 0; i < keys.length; i++) cleanTotals.put(keys[i], stored[i]);`,
  ],
  [
    'the mismatch becomes a note',
    `        JSONObject draft = new JSONObject().put("items", items).put("totals", cleanTotals).put("notes", new JSONArray().put(notes))`,
    `        // Say it plainly instead of failing: the numbers come from the detail, which the user can edit.
        if (mismatch) notes = notes + "；" + cn.qingheng.health.store.NutritionMath.mismatchNote(oilGrams);
        JSONObject draft = new JSONObject().put("items", items).put("totals", cleanTotals).put("notes", new JSONArray().put(notes))`,
  ],
]);

// 预览与保存用同一个口径：明细 + 油
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'totals include the oil, in the preview',
    `  function updatePreviewTotals() {const totals=totalsFor(readItems());$('#estimate-totals').textContent=\`合计：\${fmt(totals.calories)} kcal · 蛋白质 \${fmt(totals.protein)}g · 脂肪 \${fmt(totals.fat)}g · 碳水 \${fmt(totals.carbs)}g\`;}`,
    `  /** Canonical totals for the draft: line items plus the cooking oil that was estimated separately. */
  function estimateTotals(items) {
    const totals = totalsFor(items);
    const oil = number(draft?.oilGrams) ?? 0;
    if (oil > 0) {
      totals.calories = (totals.calories ?? 0) + oil * 9;
      totals.fat = (totals.fat ?? 0) + oil;
    }
    return totals;
  }
  function updatePreviewTotals() {const totals=estimateTotals(readItems());$('#estimate-totals').textContent=\`合计：\${fmt(totals.calories)} kcal · 蛋白质 \${fmt(totals.protein)}g · 脂肪 \${fmt(totals.fat)}g · 碳水 \${fmt(totals.carbs)}g\`;}`,
  ],
  [
    'and in what gets saved',
    `      const totals=totalsFor(items);if(Object.values(totals).some(value=>value===null || !Number.isFinite(value))) throw new Error('请填写全部营养数值。');`,
    `      const totals=estimateTotals(items);if(Object.values(totals).some(value=>value===null || !Number.isFinite(value))) throw new Error('请填写全部营养数值。');`,
  ],
]);

console.log('nutrition totals unified');
