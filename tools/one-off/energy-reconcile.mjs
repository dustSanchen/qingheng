import fs from 'node:fs';
// 1) NutritionMath: 宏量→热量、偏差判定、逐项校正
const p = 'app/src/main/java/cn/qingheng/health/store/NutritionMath.java';
let t = fs.readFileSync(p, 'utf8');
if (!t.includes('caloriesFromMacros')) {
  t = t.replace(
    '    /** 1 g of fat/oil is 9 kcal, and oil is fat for macro purposes. */',
    `    /** Atwater factors: protein 4, carbs 4, fat 9 kcal per gram. */
    public static double caloriesFromMacros(double protein, double carbs, double fat) {
        return protein * 4 + carbs * 4 + fat * 9;
    }

    /**
     * True when a stated calorie value cannot come from its own macros: more than 12% or 30 kcal off.
     * A model that writes 600 kcal for 30 g protein + 50 g carbs + 20 g fat (560) is inside tolerance;
     * one that writes 800 for the same macros is not.
     */
    public static boolean energyMismatch(double statedKcal, double macroKcal) {
        return Math.abs(statedKcal - macroKcal) > Math.max(30, macroKcal * 0.12);
    }

    /** The calorie value to store: macro-derived when the stated one is inconsistent, else as given. */
    public static double reconciledKcal(double statedKcal, double protein, double carbs, double fat) {
        double macros = caloriesFromMacros(protein, carbs, fat);
        return energyMismatch(statedKcal, macros) ? round1(macros) : statedKcal;
    }

    /** 1 g of fat/oil is 9 kcal, and oil is fat for macro purposes. */`);
  fs.writeFileSync(p, t);
  console.log('ok  NutritionMath energy helpers');
} else console.log('skip NutritionMath');

// 2) estimate: 逐项按宏量校正热量，并写一条说明
const m = 'app/src/main/java/cn/qingheng/health/MainActivity.java';
let s = fs.readFileSync(m, 'utf8');
const anchor = `        double[] derived = cn.qingheng.health.store.NutritionMath.totals(itemValues, oilGrams);`;
if (!s.includes('energyReconciled')) {
  s = s.replace(anchor,
`        // A model can state a calorie number that its own macros cannot produce. Trust the macros and
        // fix the calorie field, so "1,040 kcal" and "protein/carbs/fat" never tell different stories.
        boolean energyReconciled = false;
        for (int i = 0; i < itemValues.length; i++) {
            double[] row = itemValues[i];
            double fixed = cn.qingheng.health.store.NutritionMath.reconciledKcal(
                    row[cn.qingheng.health.store.NutritionMath.CALORIES],
                    row[cn.qingheng.health.store.NutritionMath.PROTEIN],
                    row[cn.qingheng.health.store.NutritionMath.CARBS],
                    row[cn.qingheng.health.store.NutritionMath.FAT]);
            if (fixed != row[cn.qingheng.health.store.NutritionMath.CALORIES]) {
                row[cn.qingheng.health.store.NutritionMath.CALORIES] = fixed;
                energyReconciled = true;
            }
        }
${anchor}`);
  s = s.replace(
`        if (mismatch) notes = notes + "；" + cn.qingheng.health.store.NutritionMath.mismatchNote(oilGrams);`,
`        if (mismatch) notes = notes + "；" + cn.qingheng.health.store.NutritionMath.mismatchNote(oilGrams);
        if (energyReconciled) notes = notes + "；有食物的热量与三大营养素对不上，已按 4/4/9 重算";`);
  fs.writeFileSync(m, s);
  console.log('ok  estimate reconciles energy');
} else console.log('skip estimate');
