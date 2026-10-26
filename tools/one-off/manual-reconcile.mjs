import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  ['manual entries are reconciled too',
   `            Double grams = finite(record, "grams");
            for (String key : new String[]{"calories", "protein", "carbs", "fat"}) {
                Double value = finite(record, key);
                if (value == null && totals != null) value = finite(totals, key);
                single.put(key, value == null ? 0 : Math.round(value * 10) / 10.0);
            }`,
   `            Double grams = finite(record, "grams");
            for (String key : new String[]{"calories", "protein", "carbs", "fat"}) {
                Double value = finite(record, key);
                if (value == null && totals != null) value = finite(totals, key);
                single.put(key, value == null ? 0 : Math.round(value * 10) / 10.0);
            }
            // A manual entry only supplies totals, so its calorie number was never checked against its
            // own macros. Reconcile it here (and write the fixed value back) so manual rows are auditable.
            Double fiberField = finite(record, "fiber");
            double fiberValue = fiberField == null ? 0 : Math.max(0, fiberField);
            double fixedKcal = cn.qingheng.health.store.NutritionMath.reconciledKcal(
                    single.optDouble("calories", 0), single.optDouble("protein", 0),
                    single.optDouble("carbs", 0), single.optDouble("fat", 0), fiberValue);
            single.put("calories", fixedKcal);
            record.put("calories", fixedKcal);
            if (totals != null) {
                double previous = totals.optDouble("calories", 0);
                totals.put("calories", fixedKcal);
                if (Math.abs(previous - fixedKcal) > 0.5) {
                    record.put("energyReconciled", true);
                }
            }`],
]);
console.log('manual reconcile wired');
