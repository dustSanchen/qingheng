/*
 * QinghengFoods - food composition reference for Qingheng.
 *
 * Ingredient rows are derived from the USDA FoodData Central SR Legacy release
 * (public-domain United States federal data, released 2018-04). Each ingredient
 * row records the exact fdcId it was read from; kcal / protein / fat / carbohydrate
 * per 100 g are machine-read from that dataset, not hand-typed. Verify any row at
 * https://fdc.nal.usda.gov/ by its fdcId.
 *
 * USDA FoodData Central is a work of the United States federal government and is
 * in the public domain, with no licence restrictions on reuse.
 *
 * Cross-check reference: https://ostsc.cn/ (a Chinese Food Composition Table search
 * service that also exposes a USDA section). Cited as a lookup service only; no data
 * was bulk copied or scraped from it.
 *
 * Mixed-dish rows are NOT USDA data. USDA has no entry for cooked Chinese dishes,
 * so those rows are illustrative estimates authored for this app, carry a modelled
 * amount of cooking oil, and are marked sourceStatus 'illustrative-mixed-dish'.
 *
 * Units: kcal and grams per 100 g edible portion. 'basis' records raw / cooked /
 * as-served so raw and cooked weights are never mixed. portionGrams is a suggestion,
 * not a measurement.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof globalThis !== 'undefined') globalThis.QinghengFoods = api;
  if (root) root.QinghengFoods = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';
  const KEYS = ['calories', 'protein', 'fat', 'carbs'];
  const MAX_GRAMS = 20000;
  const USDA_STATUS = 'usda-fdc-sr-legacy';
  const DISH_STATUS = 'illustrative-mixed-dish';
  const SOURCE_STATUS = 'usda-fdc-sr-legacy-with-illustrative-dishes';
  const REFERENCE_URLS = ['https://fdc.nal.usda.gov/', 'https://ostsc.cn/'];
  const entries = [];
  function add(name, aliases, category, basis, values, portionGrams, note) {
    entries.push({name, aliases: [name, ...aliases], category, basis,
      per100: Object.fromEntries(KEYS.map((key, i) => [key, values[i]])),
      portionGrams, note, includesOil: false, sourceStatus: USDA_STATUS});
  }
  function dish(name, aliases, values, range, portion, recipe) {
    add(name, aliases, 'mixed_dish', 'as_served', values, portion,
      '示例配方，仅为独立编写的一般估算（非固定食谱）：' + recipe + '。数值含示例烹调油，不要再次自动加油；实际配方、用油量及含水量差异很大。');
    const entry = entries[entries.length - 1];
    Object.assign(entry, {sourceStatus: DISH_STATUS, includesOil: true,
      calorieRangePer100: range, illustrativeRecipe: recipe});
  }

  // ---- Ingredient rows: USDA FoodData Central, SR Legacy (2018-04) ----