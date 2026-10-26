package cn.qingheng.health.store;

/**
 * Nutrition arithmetic for one meal estimate.
 *
 * One rule, applied everywhere: the meal's totals are the sum of its line items plus the cooking oil
 * that was estimated separately. The model is asked to bake oil into its totals, the preview shows the
 * number the record will store, and the stored record must agree with both — the original bug was that
 * each layer applied a different rule, so every stir-fried meal looked "inconsistent".
 *
 * Pure: no Android, no org.json, so it can be exercised on a plain JVM.
 */
public final class NutritionMath {
    private NutritionMath() { }

    /** Field order used by every array in this class: calories, protein, carbs, fat. */
    public static final int CALORIES = 0, PROTEIN = 1, CARBS = 2, FAT = 3, FIELDS = 4;

    /** Atwater factors: protein 4, carbs 4, fat 9 kcal per gram. */
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

    /**
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

    /** 1 g of fat/oil is 9 kcal, and oil is fat for macro purposes. */
    public static final double OIL_KCAL_PER_GRAM = 9;

    /** Sums line items; null rows or null fields count as zero. */
    public static double[] sumItems(double[][] items) {
        double[] out = new double[FIELDS];
        if (items == null) return out;
        for (double[] row : items) {
            if (row == null) continue;
            for (int i = 0; i < FIELDS && i < row.length; i++) out[i] += row[i];
        }
        return out;
    }

    /** Adds cooking oil to a base total: calories and fat only. */
    public static double[] withOil(double[] base, double oilGrams) {
        double[] out = base == null ? new double[FIELDS] : base.clone();
        if (oilGrams > 0) {
            out[CALORIES] += oilGrams * OIL_KCAL_PER_GRAM;
            out[FAT] += oilGrams;
        }
        return out;
    }

    /** The canonical totals for a meal: line items plus oil. */
    public static double[] totals(double[][] items, double oilGrams) {
        return withOil(sumItems(items), oilGrams);
    }

    /**
     * True when a supplied total is far enough from the derived one to be worth telling the user about.
     * The tolerance is 2 units or 10% of the derived value, whichever is larger — the same rule the
     * estimate gate always used, now only used for a note instead of a hard failure.
     */
    public static boolean differs(double supplied, double derived) {
        double tolerance = Math.max(2, derived * 0.1);
        return Math.abs(supplied - derived) > tolerance;
    }

    /** One decimal place, enough for kcal and grams without noisy floats in the UI. */
    public static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }

    /** Rounds a whole field vector for storage. */
    public static double[] rounded(double[] values) {
        double[] out = new double[FIELDS];
        for (int i = 0; i < FIELDS; i++) out[i] = round1(i < values.length ? values[i] : 0);
        return out;
    }

    /** A short, human explanation when the model's own totals disagreed with its line items. */
    public static String mismatchNote(double oilGrams) {
        return oilGrams > 0
                ? "模型给出的总量与明细对不上，已按「明细 + 用油 " + (long)Math.round(oilGrams) + " g」重算"
                : "模型给出的总量与明细对不上，已按明细重算";
    }
}
