/**
 * 修「碳水算不出来」的两处缺陷：
 *  1) 缺碳水时没有兜底：一项食物只要热量、蛋白、脂肪齐全但碳水漏填，碳水就记成 0，
 *     总量与热量对不上。现在按「热量里蛋白与脂肪解释不掉的部分」反推碳水，并留一条说明。
 *  2) 碳水上限（carbCap）只在 profile.calorieTarget 存在时才计算；当天目标/临时目标存在时
 *     该字段可能为空，界面就显示「—」。改为回退到当天的热量区间上限。
 */
import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

// ---------------------------------------------------------------- 1) Java：缺碳水兜底 ---------------
const math = 'app/src/main/java/cn/qingheng/health/store/NutritionMath.java';
patch(math, [
  ['infer missing carbs',
   '    /** 1 g of fat/oil is 9 kcal, and oil is fat for macro purposes. */',
   `    /**
     * True when a row states calories, protein and fat but no carbohydrate at all, and those macros
     * cannot explain the calories. That is the shape of "food carbs show 0" records.
     */
    public static boolean carbsMissing(double calories, double protein, double carbs, double fat) {
        return carbs <= 0 && calories > (protein * 4 + fat * 9) + 60;
    }

    /** Carbs implied by the calories that protein and fat cannot explain; 0 when nothing is left. */
    public static double inferredCarbs(double calories, double protein, double fat) {
        double rest = calories - protein * 4 - fat * 9;
        return rest > 60 ? round1(rest / 4) : 0;
    }

    /** 1 g of fat/oil is 9 kcal, and oil is fat for macro purposes. */`],
]);

// 估算路径：逐项补碳水
const main = 'app/src/main/java/cn/qingheng/health/MainActivity.java';
patch(main, [
  ['estimate infers carbs per item',
   `        boolean energyReconciled = false;`,
   `        // A food can come back with calories/protein/fat but zero carbs; storing that makes the meal
        // disagree with its own calories. Infer the missing carbs before reconciling energy.
        boolean carbsInferred = false;
        for (int i = 0; i < itemValues.length; i++) {
            double[] row = itemValues[i];
            if (cn.qingheng.health.store.NutritionMath.carbsMissing(
                    row[cn.qingheng.health.store.NutritionMath.CALORIES],
                    row[cn.qingheng.health.store.NutritionMath.PROTEIN],
                    row[cn.qingheng.health.store.NutritionMath.CARBS],
                    row[cn.qingheng.health.store.NutritionMath.FAT])) {
                row[cn.qingheng.health.store.NutritionMath.CARBS] = cn.qingheng.health.store.NutritionMath.inferredCarbs(
                        row[cn.qingheng.health.store.NutritionMath.CALORIES],
                        row[cn.qingheng.health.store.NutritionMath.PROTEIN],
                        row[cn.qingheng.health.store.NutritionMath.FAT]);
                carbsInferred = true;
            }
        }
        boolean energyReconciled = false;`],
  ['estimate notes the inferred carbs',
   `        if (energyReconciled) notes = notes + "；有食物的热量与三大营养素对不上，已按 4/4/9 重算";`,
   `        if (carbsInferred) notes = notes + "；有食物没给碳水，已按剩余热量反推";
        if (energyReconciled) notes = notes + "；有食物的热量与三大营养素对不上，已按 4/4/9 重算";`],
  ['manual entries infer carbs too',
   `            Double fiberField = finite(record, "fiber");`,
   `            // Same fallback for a manual row: calories and protein/fat but an empty carbs field.
            if (cn.qingheng.health.store.NutritionMath.carbsMissing(
                    single.optDouble("calories", 0), single.optDouble("protein", 0),
                    single.optDouble("carbs", 0), single.optDouble("fat", 0))) {
                single.put("carbs", cn.qingheng.health.store.NutritionMath.inferredCarbs(
                        single.optDouble("calories", 0), single.optDouble("protein", 0), single.optDouble("fat", 0)));
                record.put("carbs", single.optDouble("carbs", 0));
                if (totals != null) totals.put("carbs", single.optDouble("carbs", 0));
            }
            Double fiberField = finite(record, "fiber");`],
]);

// ---------------------------------------------------------------- 2) JS：碳水上限兜底 --------------
patch('app/src/fragments/00-head.fragment.js', [
  ['carb cap falls back to the day range',
   `  function carbCap(p) {
    const kcal = number(p.calorieTarget), protein = number(p.proteinMax), fat = number(p.fatMax);
    if (kcal === null || kcal <= 0) return null;`,
   `  function carbCap(p, range) {
    // calorieTarget can be empty on a temporary-target day; fall back to the day's range max so the
    // carbohydrate limit still renders instead of showing a dash.
    const kcal = number(p.calorieTarget) ?? number(range && range.max), protein = number(p.proteinMax), fat = number(p.fatMax);
    if (kcal === null || kcal <= 0) return null;`],
]);

patch('app/src/fragments/00-head.fragment.js', [
  ['pass the range into carbCap',
   "['carbs','碳水',null,carbCap(p)]",
   "['carbs','碳水',null,carbCap(p, range)]"],
]);

console.log('carb fixes applied');
