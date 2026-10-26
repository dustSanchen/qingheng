import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/70-rest.fragment.js', [
  ['preview totals infer missing carbs',
   `  function estimateTotals(items) {
    const totals = totalsFor(items);`,
   `  /** Carbs a row does not state but its calories imply; mirrors NutritionMath.inferredCarbs on the client. */
  function carbOfItem(item) {
    const carbs = number(item.carbs);
    if (carbs !== null && carbs > 0) return carbs;
    const kcal = number(item.calories), protein = number(item.protein) ?? 0, fat = number(item.fat) ?? 0;
    if (kcal === null) return carbs ?? 0;
    const rest = kcal - protein * 4 - fat * 9;
    return rest > 60 ? Math.round(rest / 4 * 10) / 10 : (carbs ?? 0);
  }
  function estimateTotals(items) {
    // A row can arrive with calories, protein and fat but no carbs; the preview must not show 0 carbs
    // for a 261 kcal bowl of rice. The saved record applies the same rule server-side.
    const patched = (items || []).map(item => ({...item, carbs: carbOfItem(item)}));
    const totals = totalsFor(patched);`],
]);
console.log('preview carbs wired');
