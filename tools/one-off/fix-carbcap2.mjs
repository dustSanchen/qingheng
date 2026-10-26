import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/10-rich-answer.fragment.js', [
  ['carb cap falls back to the day range',
   `  function carbCap(p) {
    const kcal = number(p.calorieTarget), protein = number(p.proteinMax), fat = number(p.fatMax);
    if (kcal === null || kcal <= 0) return null;`,
   `  function carbCap(p, range) {
    // calorieTarget can be empty on a temporary-target day; fall back to the day's range max so the
    // carbohydrate limit still renders instead of showing a dash.
    const kcal = number(p.calorieTarget) ?? number(range && range.max), protein = number(p.proteinMax), fat = number(p.fatMax);
    if (kcal === null || kcal <= 0) return null;`],
  ['pass the range into carbCap',
   "['carbs','碳水',null,carbCap(p)]",
   "['carbs','碳水',null,carbCap(p, range)]"],
]);
console.log('carbCap patched');
