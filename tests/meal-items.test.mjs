/**
 * 逐项热量断言：保存必有 items、问答载荷带 items、界面可展开。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');
const app = read('app/src/main/assets/app.js');
const css = read('app/src/main/assets/styles.css');

// --- save path ---------------------------------------------------------------------------------------
check('saving a meal always writes items', main.includes('record.put("items", cleanMealItems(record));'));
check('the helper sanitises existing items', main.includes('private static JSONArray cleanMealItems(JSONObject record)'));
check('manual entries get one synthetic item', main.includes('"（未拆分）"'));
check('item fields are validated and rounded', main.includes('for (String key : new String[]{"grams", "calories", "protein", "carbs", "fat"})') && main.includes('Math.round(value * 10) / 10.0'));
check('the item count is capped', main.includes('out.length() < 100'));

// --- question payload --------------------------------------------------------------------------------
check('the question window adds items', main.includes('JSONArray itemRows = mealItemsForPrompt(record);'));
check('items are compacted for the model', main.includes('private static JSONArray mealItemsForPrompt(JSONObject record)'));
check('biggest contributor first', main.includes('rows.sort((a, b) -> Double.compare(b.optDouble("kcal", 0), a.optDouble("kcal", 0)));'));
check('the list is capped at eight', main.includes('i < 8; i++') && main.includes('"（另有 " + (rows.size() - 8) + " 项未列出）"'));
check('the prompt tells the model to name the food', prompts.includes('必须点名到具体食物'));

// --- export ------------------------------------------------------------------------------------------
check('markdown export lists items', main.includes('append("  - ").append(cell(optionalText(item, "name")))'));

// --- ui ----------------------------------------------------------------------------------------------
check('each meal shows a breakdown toggle', app.includes('data-meal-items=') && app.includes('查看每项热量'));
check('items are sorted by calories in the ui', app.includes('sort((a, b) => (number(b.calories) ?? 0) - (number(a.calories) ?? 0))'));
check('the toggle expands a panel', app.includes("const panel = toggle.parentElement?.querySelector('.meal-items');"));
check('the panel is hidden by default', app.includes('class="meal-items" hidden'));
check('styles exist', css.includes('.meal-items-toggle{') && css.includes('.meal-item{display:flex'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
