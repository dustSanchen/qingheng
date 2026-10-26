// Generates app/src/main/assets/food-models.js.
// Ingredient rows come from the USDA FoodData Central SR Legacy CSV release
// (public-domain US federal data) joined to tools/usda-catalogue.json by fdc_id.
// Mixed-dish rows stay illustrative app-authored estimates (USDA has no such entries).
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const csvDir = process.env.USDA_CSV_DIR || path.resolve(root, '..', 'codex', 'artifacts', 'usda',
  'FoodData_Central_sr_legacy_food_csv_2018-04');
const csvFile = name => path.join(csvDir, name);
if (!existsSync(csvFile('food.csv'))) {
  console.error('USDA CSV release not found at ' + csvDir + ' - set USDA_CSV_DIR.');
  process.exit(1);
}
function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function table(name) {
  const raw = parseCsv(readFileSync(csvFile(name), 'utf8'));
  const header = raw[0];
  return raw.slice(1).filter(r => r.length === header.length)
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}const ENERGY = '1008', PROTEIN = '1003', FAT = '1004', CARBS = '1005';
const descriptions = new Map(table('food.csv').map(r => [r.fdc_id, r.description]));
const nutrients = new Map();
for (const r of table('food_nutrient.csv')) {
  if (![ENERGY, PROTEIN, FAT, CARBS].includes(r.nutrient_id)) continue;
  const n = nutrients.get(r.fdc_id) || {};
  n[r.nutrient_id] = Number(r.amount);
  nutrients.set(r.fdc_id, n);
}
const catalogue = JSON.parse(readFileSync(path.join(here, 'usda-catalogue.json'), 'utf8'));
const round = v => Math.round(v * 100) / 100;
const ingredients = catalogue.map(([name, aliases, category, basis, portion, fdcId, note]) => {
  const n = nutrients.get(String(fdcId));
  if (!n) throw new Error('fdc_id ' + fdcId + ' has no nutrients (' + name + ')');
  for (const k of [ENERGY, PROTEIN, FAT, CARBS]) {
    if (!Number.isFinite(n[k])) throw new Error('fdc_id ' + fdcId + ' missing nutrient ' + k + ' (' + name + ')');
  }
  const description = descriptions.get(String(fdcId));
  if (!description) throw new Error('fdc_id ' + fdcId + ' not in food.csv (' + name + ')');
  return {name, aliases, category, basis, portion, fdcId: String(fdcId), description,
    per100: [round(n[ENERGY]), round(n[PROTEIN]), round(n[FAT]), round(n[CARBS])], note};
});
const seen = new Set();
for (const r of ingredients) {
  for (const alias of [r.name, ...r.aliases]) {
    const key = alias.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, '');
    if (!key) throw new Error('empty alias');
    if (seen.has(key)) throw new Error('duplicate alias: ' + alias);
    seen.add(key);
  }
}
writeFileSync(path.join(here, 'usda-ingredients.resolved.json'), JSON.stringify(ingredients, null, 2) + '\n', 'utf8');
console.log('resolved ' + ingredients.length + ' ingredient rows, ' + seen.size + ' aliases');
console.log('USDA source: https://fdc.nal.usda.gov/ | cross-check: https://ostsc.cn/');
// ---- Mixed dishes: illustrative app-authored estimates, not USDA data ----
const dishes = [
  ['番茄炒蛋', ['西红柿炒鸡蛋','西红柿炒蛋','番茄炒鸡蛋'], [105,6,7,4.5], [75,165], 200, '鸡蛋、番茄、少量食用油和调味混合炒制'],
  ['宫保鸡丁', [], [185,15,11,7], [130,280], 200, '鸡肉、花生、蔬菜、糖和油炒制，比例可变'],
  ['鱼香肉丝', [], [170,10,10,10], [110,260], 200, '猪肉丝、蔬菜、糖醋酱和油混合炒制'],
  ['青椒肉丝', ['青椒炒肉丝'], [145,12,9,4], [95,220], 200, '瘦猪肉、青椒和油混合炒制'],
  ['回锅肉', [], [290,12,24,6], [200,420], 180, '肥瘦猪肉、青椒或蒜苗、酱料和油炒制'],
  ['红烧肉', [], [350,12,30,8], [240,480], 150, '肥瘦猪肉、糖、酱油及油焖烧，肥瘦和收汁程度可变'],
  ['麻婆豆腐', [], [125,8,8,5], [80,200], 200, '豆腐、少量肉末、豆瓣酱和油混合烧制'],
  ['家常豆腐', [], [155,9,10,7], [100,240], 200, '豆腐、蔬菜和油煎炒，吸油量可变'],
  ['地三鲜', [], [155,2,10,15], [90,260], 200, '土豆、茄子、青椒和油炒制，吸油量可变'],
  ['清炒西兰花', ['炒西兰花'], [65,3,4,6], [40,120], 150, '西兰花、少量蒜与油炒制'],
  ['蒜蓉菠菜', ['清炒菠菜','炒菠菜'], [60,3,4,3], [35,110], 150, '菠菜、蒜与少量油炒制'],
  ['酸辣土豆丝', ['炒土豆丝'], [110,2,4,17], [80,180], 200, '土豆丝、醋、辣椒与油炒制'],
  ['木须肉', ['木樨肉'], [150,11,10,4], [100,230], 200, '猪肉、鸡蛋、木耳、黄瓜与油炒制'],
  ['糖醋里脊', [], [260,13,14,20], [190,360], 180, '里脊肉、淀粉、糖醋汁及煎炸油'],
  ['蛋炒饭', ['鸡蛋炒饭'], [180,5,6,27], [140,260], 250, '熟米饭、鸡蛋、少量蔬菜和油炒制'],
  ['炒面', ['家常炒面'], [190,6,7,26], [140,280], 250, '熟面条、蔬菜、少量肉与油炒制'],
  ['猪肉白菜饺子', ['白菜猪肉饺子'], [190,8,7,24], [150,260], 200, '面皮、猪肉、白菜及馅料油水煮'],
  ['猪肉包子', ['鲜肉包子'], [230,8,8,31], [180,310], 100, '发面皮、猪肉馅及少量馅料油蒸制'],
  ['馄饨', ['猪肉馄饨'], [150,7,5,19], [100,220], 200, '面皮、猪肉馅及少量油，按沥汤可食部估算'],
  ['牛肉面', [], [110,6,3,15], [70,180], 450, '熟面条、牛肉、青菜、汤与少量油，按整碗含汤重量'],
];
const dishLines = dishes.map(d => {
  const [name, aliases, values, range, portion, recipe] = d;
  return `  dish(${JSON.stringify(name)}, ${JSON.stringify(aliases)}, ${JSON.stringify(values)}, `
    + `${JSON.stringify(range)}, ${portion}, ${JSON.stringify(recipe)});`;
}).join('\n');
// ---- Assemble app/src/main/assets/food-models.js from the template ----
const ingredientLines = ingredients.map(r => {
  const note = r.note + ' 数据：USDA FoodData Central SR Legacy，fdcId ' + r.fdcId + '（' + r.description + '）。';
  return `  add(${JSON.stringify(r.name)}, ${JSON.stringify(r.aliases)}, ${JSON.stringify(r.category)}, `
    + `${JSON.stringify(r.basis)}, ${JSON.stringify(r.per100)}, ${r.portion}, ${JSON.stringify(note)}, ${JSON.stringify(r.fdcId)});`;
}).join('\n');
const template = readFileSync(path.join(here, 'food-models.template.js'), 'utf8');
for (const marker of ['/*@@INGREDIENTS@@*/', '/*@@DISHES@@*/']) {
  if (template.split(marker).length !== 2) throw new Error('template marker missing or repeated: ' + marker);
}
const output = template.replace('/*@@INGREDIENTS@@*/', () => ingredientLines).replace('/*@@DISHES@@*/', () => dishLines);
const target = path.join(root, 'app', 'src', 'main', 'assets', 'food-models.js');
writeFileSync(target, output, 'utf8');
console.log('wrote ' + path.relative(root, target) + ': ' + ingredients.length + ' USDA ingredients + '
  + dishes.length + ' illustrative dishes = ' + (ingredients.length + dishes.length) + ' entries, ' + output.length + ' chars');
