import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  ['static array-returning helper',
   `    /** Rounded per-item rows; a single synthetic item when only totals were supplied. */
    private JSONObject cleanMealItems(JSONObject record) throws Exception {`,
   `    /** Rounded per-item rows; a single synthetic item when only totals were supplied. */
    private static JSONArray cleanMealItems(JSONObject record) throws Exception {`],
]);
console.log('signature fixed');
