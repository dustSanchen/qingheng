import fs from 'node:fs';

// 1) 纤维按 2 kcal/g：NutritionMath 支持 fiber，碳水里扣掉纤维重量
const p = 'app/src/main/java/cn/qingheng/health/store/NutritionMath.java';
let t = fs.readFileSync(p, 'utf8');
if (!t.includes('caloriesFromMacros(double protein, double carbs, double fat, double fiber)')) {
  t = t.replace(`    /** Atwater factors: protein 4, carbs 4, fat 9 kcal per gram. */
    public static double caloriesFromMacros(double protein, double carbs, double fat) {
        return protein * 4 + carbs * 4 + fat * 9;
    }`,
`    /** Atwater factors: protein 4, carbs 4, fat 9 kcal per gram. */
    public static double caloriesFromMacros(double protein, double carbs, double fat) {
        return protein * 4 + carbs * 4 + fat * 9;
    }

    /**
     * Fiber-aware energy. Fiber is counted inside carbohydrate on Chinese labels but only yields about
     * 2 kcal/g, so a high-fiber meal is overstated by (carbs - fiber) * 2 when it is treated as 4 kcal/g.
     * Fiber is clamped to [0, carbs] so bad input cannot produce negative energy.
     */
    public static double caloriesFromMacros(double protein, double carbs, double fat, double fiber) {
        double clampedFiber = Math.max(0, Math.min(fiber, carbs));
        return protein * 4 + (carbs - clampedFiber) * 4 + clampedFiber * 2 + fat * 9;
    }

    /** Energy reconciliation with fiber; fiber <= 0 falls back to the plain 4/4/9 rule. */
    public static double reconciledKcal(double statedKcal, double protein, double carbs, double fat, double fiber) {
        double macros = fiber > 0 ? caloriesFromMacros(protein, carbs, fat, fiber) : caloriesFromMacros(protein, carbs, fat);
        return energyMismatch(statedKcal, macros) ? round1(macros) : statedKcal;
    }`);
  fs.writeFileSync(p, t);
  console.log('ok  fiber-aware energy');
} else console.log('skip fiber');

// 2) 估算：解析可选 fiber，校正时带上纤维
const m = 'app/src/main/java/cn/qingheng/health/MainActivity.java';
let s = fs.readFileSync(m, 'utf8');
if (!s.includes('double[] fiberPerItem')) {
  s = s.replace(`        boolean energyReconciled = false;`,
`        // Fiber (optional per item) is part of carbs but only ~2 kcal/g: keep it so dense vegetables and
        // oats do not get over-counted by (carbs - fiber) * 2.
        double[] fiberPerItem = new double[items.length()];
        for (int i = 0; i < items.length(); i++) {
            Double fiber = finite(items.getJSONObject(i), "fiber");
            fiberPerItem[i] = fiber == null ? 0 : Math.max(0, fiber);
        }
        boolean energyReconciled = false;`);
  s = s.replace(`            double fixed = cn.qingheng.health.store.NutritionMath.reconciledKcal(
                    row[cn.qingheng.health.store.NutritionMath.CALORIES],
                    row[cn.qingheng.health.store.NutritionMath.PROTEIN],
                    row[cn.qingheng.health.store.NutritionMath.CARBS],
                    row[cn.qingheng.health.store.NutritionMath.FAT]);`,
`            double fixed = cn.qingheng.health.store.NutritionMath.reconciledKcal(
                    row[cn.qingheng.health.store.NutritionMath.CALORIES],
                    row[cn.qingheng.health.store.NutritionMath.PROTEIN],
                    row[cn.qingheng.health.store.NutritionMath.CARBS],
                    row[cn.qingheng.health.store.NutritionMath.FAT],
                    fiberPerItem[i]);`);
  s = s.replace(`        if (energyReconciled) notes = notes + "；有食物的热量与三大营养素对不上，已按 4/4/9 重算";`,
`        if (energyReconciled) notes = notes + "；有食物的热量与三大营养素对不上，已按 4/4/9 重算";
        if (energyReconciled && hasFiber) notes = notes + "（膳食纤维按 2 kcal/g）";`);
  s = s.replace(`        double[] fiberPerItem = new double[items.length()];
        for (int i = 0; i < items.length(); i++) {
            Double fiber = finite(items.getJSONObject(i), "fiber");
            fiberPerItem[i] = fiber == null ? 0 : Math.max(0, fiber);
        }`,
`        double[] fiberPerItem = new double[items.length()];
        boolean hasFiber = false;
        for (int i = 0; i < items.length(); i++) {
            Double fiber = finite(items.getJSONObject(i), "fiber");
            fiberPerItem[i] = fiber == null ? 0 : Math.max(0, fiber);
            if (fiberPerItem[i] > 0) hasFiber = true;
        }`);
  fs.writeFileSync(m, s);
  console.log('ok  estimate reads fiber');
} else console.log('skip estimate fiber');

// 3) 手动记录：合成项也按宏量校正（这是"手动记录无法校验"的修复）
if (!s.includes('manual item reconciled')) {
  s = s.replace(`            single.put("calories", value == null ? 0 : Math.round(value * 10) / 10.0);`.replace('            single.put("calories"', '            single.put("calories"'), `            single.put("calories", value == null ? 0 : Math.round(value * 10) / 10.0);`);
}
