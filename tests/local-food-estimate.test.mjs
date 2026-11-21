/**
 * Local-food pre-pass: exact USDA-backed foods with explicit grams finish without a model.
 * Unknown foods must fall through to the existing estimate path.
 */
import fs from 'node:fs';
import {createRequire} from 'node:module';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const require = createRequire(import.meta.url);
const foods = require('../app/src/main/assets/food-models.js');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing function ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '';
  for (let i = open; i < source.length; i++) {
    const ch = source[i], prev = source[i - 1];
    if (quote) {
      if (ch === quote && prev !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated ' + name);
}

const local = new Function('window', extractFunction(app, 'localFoodEstimate') + '\nreturn localFoodEstimate;')({QinghengFoods: foods});
const draft = local('米饭 100g、鸡胸肉 150g');
check('two exact USDA foods become a local draft', draft && draft.items.length === 2, draft && draft.items.length);
check('the local source is explicit', draft.source === 'local' && draft.confidence === 'medium', draft.source);
check('grams are preserved', draft.items[0].grams === 100 && draft.items[1].grams === 150, draft.items.map(item => item.grams).join(','));
check('macros come from FoodModels.estimate', draft.items[0].calories === foods.estimate('米饭', 100).calories);
check('no implicit cooking oil is added to a plain ingredient', draft.items[0].oilGrams === undefined && draft.items[0].method === '蒸');
check('a local draft has a stable-enough local id', /^local-food-\d+$/.test(draft.draftId), draft.draftId);

const kg = local('鸡胸肉 0.15kg');
check('kg is converted to grams', kg && kg.items[0].grams === 150, kg && kg.items[0].grams);
const stir = local('炒鸡胸肉 150g');
check('an explicit cooking method is preserved', stir && stir.items[0].method === '炒', stir && stir.items[0].method);
check('an unknown food falls through', local('火星食物 100g') === null);
check('a line without grams falls through', local('米饭') === null);
check('a mixed known/unknown line falls through as a whole', local('米饭 100g、火星食物 100g') === null);

check('the submit path tries local before the model', app.indexOf('localFoodEstimate(text)') > 0 && app.indexOf('localFoodEstimate(text)') < app.indexOf("api('/api/estimate/stream'"));
check('the local preview still asks for confirmation', app.includes("本地食品库已匹配；请核对克重与用油后确认。") && app.includes('生成估算预览'));
check('oilIncluded dishes are not oiled again', app.includes('if (next.oilIncluded === true) return next;'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
