import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app/src/main/assets/food-models.js', import.meta.url), 'utf8');
function load(extra = {}) {
  const context = vm.createContext({...extra});
  vm.runInContext(source, context, {filename: 'food-models.js'});
  return context;
}
const foods = load().QinghengFoods;
const plain = value => JSON.parse(JSON.stringify(value));
const keys = ['calories', 'protein', 'fat', 'carbs'];
// The 12 compatibility anchors, now pinned to USDA FoodData Central SR Legacy values by fdcId.
const references = [
  ['米饭','169757',[130,2.69,.28,28.17]], ['鸡胸肉','171077',[120,22.5,2.62,0]],
  ['西兰花','170379',[34,2.82,.37,6.64]], ['鸡蛋','171287',[143,12.56,9.51,.72]],
  ['燕麦','173904',[379,13.15,6.52,67.7]], ['牛奶','172217',[61,3.15,3.27,4.78]],
  ['香蕉','173944',[89,1.09,.33,22.84]], ['苹果','171688',[52,.26,.17,13.81]],
  ['土豆','170026',[77,2.05,.09,17.49]], ['豆腐','172476',[76,8.08,4.78,1.87]],
  ['橄榄油','171413',[884,0,100,0]], ['食用油','171410',[884,0,100,0]]
];
const USDA = 'usda-fdc-sr-legacy', DISH = 'illustrative-mixed-dish';

test('standalone UTF-8 VM export works without DOM and also with window/CommonJS', () => {
  assert.ok(source.includes('米饭'));
  assert.ok(foods);
  const browser = load({window: {}});
  assert.equal(browser.window.QinghengFoods, browser.QinghengFoods);
  const common = load({module: {exports: {}}});
  assert.equal(common.module.exports, common.QinghengFoods);
  for (const key of ['search','find','estimate','calibrateDraft']) assert.equal(typeof foods[key], 'function');
  assert.ok(Object.isFrozen(foods));
  assert.ok(Object.isFrozen(foods.entries));
});

test('the 12 anchor foods carry exact USDA values, fdcIds and preparation bases', () => {
  for (const [name, fdcId, values] of references) {
    assert.equal(foods.find(name).fdcId, fdcId, name);
    assert.equal(foods.find(name).sourceStatus, USDA, name);
    assert.deepEqual(keys.map(key => foods.find(name).per100[key]), values);
    assert.deepEqual(keys.map(key => foods.estimate(name, 100)[key]), values);
  }
  assert.equal(foods.find('熟米饭').basis, 'cooked');
  assert.equal(foods.find('生鸡胸肉').basis, 'raw');
  assert.equal(foods.find('熟鸡胸肉').basis, 'cooked');
});

test('145-160 entries (USDA ingredients + illustrative dishes) have unique aliases and sensible values', () => {
  assert.ok(foods.entries.length >= 145 && foods.entries.length <= 160, 'entries: ' + foods.entries.length);
  const dishes = foods.entries.filter(entry => entry.category === 'mixed_dish');
  assert.equal(dishes.length, 20);
  assert.ok(foods.entries.length - dishes.length >= 125, 'at least 125 USDA ingredient rows');
  const aliases = new Set();
  for (const entry of foods.entries) {
    assert.ok(entry.name && entry.category && entry.note);
    assert.ok(['raw','cooked','as_served'].includes(entry.basis));
    assert.ok(entry.portionGrams > 0 && entry.portionGrams <= 1000);
    assert.equal(entry.sourceStatus, entry.category === 'mixed_dish' ? DISH : USDA);
    assert.ok(Object.isFrozen(entry.per100));
    for (const key of keys) {
      const value = entry.per100[key];
      assert.ok(Number.isFinite(value) && value >= 0, `${entry.name}: ${key}`);
      assert.ok(value <= (key === 'calories' ? 900 : 100), `${entry.name}: ${key} upper bound`);
    }
    assert.ok(entry.per100.protein + entry.per100.fat + entry.per100.carbs <= 105);
    const macroEnergy = 4 * (entry.per100.protein + entry.per100.carbs) + 9 * entry.per100.fat;
    // Fibre and reference calorie conventions can differ, especially pure oil.
    assert.ok(Math.abs(macroEnergy - entry.per100.calories) <= Math.max(30, entry.per100.calories * .2));
    for (const alias of entry.aliases) {
      const normalized = foods.normalize(alias);
      assert.ok(normalized && !aliases.has(normalized), `duplicate alias ${alias}`);
      aliases.add(normalized);
      assert.equal(foods.find(alias), entry);
      assert.equal(foods.find(` \t${alias}\n `), entry);
    }
    if (entry.category === 'mixed_dish') {
      assert.equal(entry.includesOil, true);
      assert.equal(entry.basis, 'as_served');
      assert.ok(entry.illustrativeRecipe);
      assert.match(entry.note, /示例配方/);
      const [low, high] = entry.calorieRangePer100;
      assert.ok(low > 0 && low <= entry.per100.calories && high >= entry.per100.calories && high <= 900);
      assert.equal(entry.fdcId, undefined, entry.name + ': dishes never claim a USDA fdcId');
    } else {
      assert.equal(entry.includesOil, false);
      assert.equal(entry.calorieRangePer100, undefined);
      assert.match(entry.fdcId, /^\d{6}$/, entry.name + ': fdcId');
      assert.ok(entry.note.includes('fdcId ' + entry.fdcId), entry.name + ': note cites its fdcId');
    }
  }
});

test('find only uses exact normalized names; search can discover without silently selecting', () => {
  assert.equal(foods.find(' 西 红 柿 '), foods.find('番茄'));
  for (const name of ['鸡','饭','鸡胸肉沙拉','番茄炒','炸鸡蛋','米饭100g','未知食物','',null,42]) {
    assert.equal(foods.find(name), null);
  }
  assert.equal(foods.search('鸡胸肉')[0].name, '鸡胸肉');
  assert.ok(foods.search('鸡').length > 1);
  assert.ok(foods.search('鸡').length <= 8);
  assert.equal(foods.search('鸡', 1).length, 1);
  assert.equal(foods.search('不存在').length, 0);
  for (const limit of [0,-1,NaN,Infinity,1.2,'8',null]) assert.equal(foods.search('鸡', limit).length, 0);
  assert.equal(foods.search('').length, 0);
  assert.ok(foods.search('炒', 10000).length <= foods.entries.length);
});

test('estimates roundtrip every alias, scale by grams, and expose detached model metadata', () => {
  for (const entry of foods.entries) {
    for (const alias of entry.aliases) {
      const result = foods.estimate(alias, 100);
      assert.equal(result.name, entry.name);
      assert.deepEqual(plain(result.model.per100), plain(entry.per100));
      assert.equal(foods.find(result.name), entry);
    }
    for (const grams of [.1,50,150,20000]) {
      const result = foods.estimate(entry.name, grams);
      for (const key of keys) {
        const expected = entry.per100[key] * grams / 100;
        assert.ok(Math.abs(result[key] - expected) <= .005001, `${entry.name}: ${key} ${grams}`);
      }
    }
  }
  const result = foods.estimate('西红柿炒蛋', 200);
  assert.equal(result.model.includesOil, true);
  assert.equal(result.model.confidence, 'low');
  result.model.per100.calories = -99;
  result.model.calorieRangePer100[0] = -99;
  result.model.referenceUrls.push('invalid');
  assert.equal(foods.find('番茄炒蛋').per100.calories, 105);
  assert.equal(foods.find('番茄炒蛋').calorieRangePer100[0], 75);
  assert.equal(foods.referenceUrls.length, 2);
  assert.equal(result.model.sourceStatus, DISH);
  assert.equal(result.model.fdcId, undefined);
  const rice = foods.estimate('米饭', 100);
  assert.equal(rice.model.sourceStatus, USDA);
  assert.equal(rice.model.fdcId, '169757');
});

test('unknown and invalid grams fail instead of guessing; bounds are strict', () => {
  assert.throws(() => foods.estimate('未知菜', 100), /未知食物/);
  assert.throws(() => foods.estimate('鸡', 100), /未知食物/);
  for (const grams of [0,-1,NaN,Infinity,-Infinity,20000.01,undefined,null,'100',true,{},[]]) {
    assert.throws(() => foods.estimate('米饭', grams), /克重/);
  }
  assert.equal(foods.estimate('米饭', 20000).grams, 20000);
});

test('draft calibration deep copies, preserves unknown items, replaces matches and recalculates totals', () => {
  const draft = {
    id: 'draft-1', confidence: 'high', notes: ['原说明'], other: {nested: [1, {ok: true}]},
    items: [
      {name: '熟米饭', grams: 150, calories: 999, protein: 99, fat: 99, carbs: 99, extra: {id: 1}},
      {name: '生鸡胸肉', estimatedGrams: 100, calories: 500, protein: 1, fat: 1, carbs: 1},
      {name: '未知菜', grams: 70, calories: 30, protein: 2, fat: 1, carbs: 4, extra: {original: true}}
    ], totals: {calories: 9999}
  };
  const before = plain(draft);
  const result = foods.calibrateDraft(draft);
  assert.deepEqual(draft, before);
  assert.notEqual(result, draft);
  assert.notEqual(result.other.nested, draft.other.nested);
  assert.notEqual(result.items[2].extra, draft.items[2].extra);
  assert.deepEqual(plain(result.items[2]), plain(draft.items[2]));
  assert.equal(result.items[0].name, '米饭');
  assert.equal(result.items[1].grams, 100);
  assert.deepEqual(plain(result.totals), {calories: 345, protein: 28.54, fat: 4.04, carbs: 46.26});
  assert.equal(result.confidence, 'low');
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.model.matchedItems, 2);
  assert.equal(result.model.unknownItems, 1);
  assert.match(result.notes.join('\n'), /AI估计.*不是称重或实测/);
  assert.match(result.notes.join('\n'), /配方.*烹调油.*不确定/);
  assert.match(result.notes.join('\n'), /未匹配.*保留/);
  result.items[0].extra.id = 2;
  result.other.nested[1].ok = false;
  assert.equal(draft.items[0].extra.id, 1);
  assert.equal(draft.other.nested[1].ok, true);
  const twice = foods.calibrateDraft(result);
  assert.deepEqual(plain(twice.totals), plain(result.totals));
  assert.equal(twice.notes.length, result.notes.length);
});

test('dish bases include oil; ingredient bases exclude added oil; never auto-add/deduct explicit oil', () => {
  const ingredient = foods.calibrateDraft({items: [{name:'鸡胸肉',grams:100}]});
  assert.match(ingredient.notes.join('\n'), /单独食材.*未包含额外烹调油/);
  assert.equal(ingredient.totals.calories, 120);
  const dish = foods.calibrateDraft({items: [{name:'番茄炒蛋',grams:200}]});
  assert.equal(dish.items.length, 1);
  assert.equal(dish.totals.calories, 210);
  assert.equal(dish.items[0].model.includesOil, true);
  assert.equal(dish.model.oilAutomaticallyAdded, false);
  assert.match(dish.notes.join('\n'), /已包含烹调油.*没有自动追加油/);
  const withOil = foods.calibrateDraft({items: [{name:'番茄炒蛋',grams:200},{name:'食用油',grams:10}]});
  assert.equal(withOil.items.length, 2);
  assert.equal(withOil.totals.calories, 298.4);
  assert.match(withOil.notes.join('\n'), /额外油或重复计入/);
});

test('invalid or zero draft grams stay unchanged; incomplete nutrition totals remain unknown', () => {
  for (const grams of [0,-1,NaN,Infinity,20001,'100',null]) {
    const item = {name:'米饭',grams,calories:7,protein:1,fat:2,carbs:3,nested:{kept:true}};
    const result = foods.calibrateDraft({items:[item]});
    assert.deepEqual(structuredClone(result.items[0]), item);
    assert.notEqual(result.items[0], item);
    assert.equal(result.model.invalidGramsItems, 1);
    assert.equal(result.model.matchedItems, 0);
    assert.equal(result.totals.calories, 7);
  }
  const draft = {items:[{name:'未知',grams:100,calories:NaN,protein:2,fat:Infinity}, null]};
  const result = foods.calibrateDraft(draft);
  assert.ok(Number.isNaN(result.items[0].calories));
  assert.equal(result.items[0].fat, Infinity);
  assert.deepEqual(plain(result.totals), {calories:null,protein:null,fat:null,carbs:null});
  assert.match(result.notes.join('\n'), /未知.*不按0/);
  const empty = foods.calibrateDraft({items:[]});
  assert.deepEqual(plain(empty.totals), {calories:0,protein:0,fat:0,carbs:0});
  for (const value of [null,[],{}, {items:null}, {items:'bad'}]) assert.throws(() => foods.calibrateDraft(value), /items/);
});

test('source declaration: USDA SR Legacy ingredients, illustrative dishes, ostsc.cn as lookup only', () => {
  assert.match(source, /USDA FoodData Central SR Legacy release/);
  assert.match(source, /public domain/);
  assert.match(source, /Mixed-dish rows are NOT USDA data/);
  assert.match(source, /Cited as a lookup service only; no data\s+\*?\s*was bulk copied or scraped from it/);
  assert.match(source, /No Boohee data has been scraped or licensed/);
  assert.doesNotMatch(source, /independently authored rough educational reference/);
  assert.equal(foods.sourceStatus, 'usda-fdc-sr-legacy-with-illustrative-dishes');
  assert.equal(foods.dataRelease, 'USDA FoodData Central SR Legacy (2018-04)');
  assert.deepEqual(plain(foods.referenceUrls), ['https://fdc.nal.usda.gov/', 'https://ostsc.cn/']);
  for (const entry of foods.entries) {
    assert.equal(entry.verified, undefined);
    assert.equal(entry.sources, undefined);
  }
});

// Row-level evidence: every USDA row must match the official CSV for its fdcId.
const csvDir = process.env.USDA_CSV_DIR || new URL('../../codex/artifacts/usda/FoodData_Central_sr_legacy_food_csv_2018-04/', import.meta.url);
const csvPath = name => typeof csvDir === 'string' ? csvDir.replace(/[\\/]?$/, '/') + name : new URL(name, csvDir);
let csvText = null;
try { csvText = readFileSync(csvPath('food_nutrient.csv'), 'utf8'); } catch {}
test('every USDA row equals the SR Legacy CSV values for its fdcId', {skip: csvText ? false : 'USDA CSV not present; set USDA_CSV_DIR'}, () => {
  const wanted = new Map(foods.entries.filter(entry => entry.fdcId).map(entry => [entry.fdcId, {}]));
  const ids = {'1008': 'calories', '1003': 'protein', '1004': 'fat', '1005': 'carbs'};
  for (const line of csvText.split('\n')) {
    const m = line.match(/^"\d+","(\d+)","(1008|1003|1004|1005)","([^"]*)"/);
    if (m && wanted.has(m[1])) wanted.get(m[1])[ids[m[2]]] = Math.round(Number(m[3]) * 100) / 100;
  }
  let checked = 0;
  for (const entry of foods.entries) {
    if (!entry.fdcId) continue;
    assert.deepEqual(plain(entry.per100), wanted.get(entry.fdcId), entry.name + ' vs fdcId ' + entry.fdcId);
    checked++;
  }
  assert.ok(checked >= 100, 'checked ' + checked + ' USDA rows');
});
