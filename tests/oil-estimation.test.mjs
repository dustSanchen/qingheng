/**
 * 用油本地化（2026-11-19，1.4.59）。
 * 用户要求：用油要从整体菜品判断；据查主流 AI 健康 App 里只有「按菜品类型取均值」这条路被验证过。
 * 契约：模型只给烹饪方式，油由本地按「方式 × 克重」算（基线 8.1 g/100 g，IJERPH 2019），
 * 整餐三档只乘一次，旧草稿已含油的不重复加。
 */
import fs from 'node:fs';
import vm from 'node:vm';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const source = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf("  const OIL_METHOD_FACTORS = {");
const end = source.indexOf('  function renderOilLevel() {');
if (start < 0 || end < 0) throw new Error('oil rule slice markers not found');

const sandbox = {
  number: v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)),
  String, Object, Math, Array, JSON,
};
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end) + `
this.oilRuleFor = oilRuleFor;
this.applyOilToItems = applyOilToItems;
`, sandbox);

// --- 1. 方式 × 克重 ---------------------------------------------------------------------------------------
check('a stir-fried dish uses the 8.1 g/100 g baseline', Math.abs(sandbox.oilRuleFor('炒', 200) - 16.2) < 0.01, sandbox.oilRuleFor('炒', 200));
check('deep-fried costs more oil than steamed', sandbox.oilRuleFor('炸', 100) > sandbox.oilRuleFor('炒', 100) && sandbox.oilRuleFor('炒', 100) > sandbox.oilRuleFor('蒸', 100), [sandbox.oilRuleFor('炸', 100), sandbox.oilRuleFor('炒', 100), sandbox.oilRuleFor('蒸', 100)].join('/'));
check('steamed and blanched count as zero oil', sandbox.oilRuleFor('蒸', 300) === 0 && sandbox.oilRuleFor('白灼', 300) === 0);
check('an unknown method falls back to 其他', sandbox.oilRuleFor('瞎写的方法', 100) === 6, sandbox.oilRuleFor('瞎写的方法', 100));
check('missing grams means no oil', sandbox.oilRuleFor('炒', null) === 0);

// --- 2. 油算进菜里：热量 +9 kcal/g、脂肪 +1 g/g ----------------------------------------------------------
const base = [{name: '青椒肉丝', grams: 200, method: '炒', calories: 220, protein: 14, fat: 8, carbs: 10}];
const oiled = sandbox.applyOilToItems(base, 'normal')[0];
check('oil is added to calories and fat exactly once', oiled.calories === 220 + Math.round(16.2 * 9) && Math.abs(oiled.fat - (8 + 16.2)) < 0.01, `${oiled.calories} kcal / ${oiled.fat} g fat`);
check('the dish records which method produced the oil', oiled.oilMethod === '炒' && oiled.oilGrams === 16.2, `${oiled.oilMethod}/${oiled.oilGrams}`);
const low = sandbox.applyOilToItems(base, 'low')[0];
const high = sandbox.applyOilToItems(base, 'high')[0];
check('the meal-level switch scales oil once', low.oilGrams < oiled.oilGrams && high.oilGrams > oiled.oilGrams, `${low.oilGrams}/${oiled.oilGrams}/${high.oilGrams}`);
check('a draft that already carries oil is left untouched', sandbox.applyOilToItems([{...base[0], oilGrams: 12, oilIncluded: true}], 'high')[0].oilGrams === 12);
check('steamed dishes are not inflated', sandbox.applyOilToItems([{name: '清蒸鱼', grams: 300, method: '蒸', calories: 180, protein: 30, fat: 6, carbs: 0}], 'high')[0].calories === 180);

// --- 3. 接线：提示词只要方式、解析保留方式、界面有三档 ----------------------------------------------------
const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
check('the prompt asks for a cooking method, not grams of oil', prompts.includes('每道菜必须给 method') && prompts.includes('不要输出 oilGrams'));
check('the prompt enumerates the method vocabulary', prompts.includes('炒/爆炒/红烧/干锅/煎/炸/油淋/烤/蒸/煮/炖/凉拌/白灼/生食/其他'));
check('the native parser keeps the method field', main.includes('clean.put("method", method)'));
check('the preview exposes a three-level oil switch', html.includes('id="estimate-oil-level"') && html.includes('data-oil-level="high"'));
check('the switch is wired and preserves edited grams', app.includes('setOilLevel(button.dataset.oilLevel)') && app.includes('只调整油量差额'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
