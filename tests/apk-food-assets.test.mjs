import fs from 'node:fs';
import zlib from 'node:zlib';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Verify the shipped APK, not just the working tree: the packaged assets are what the phone runs.
const dist = new URL('../dist/', import.meta.url);
const apkName = fs.readdirSync(dist).filter(name => /^qingheng-.*\.apk$/.test(name))
  .sort((a, b) => fs.statSync(new URL(a, dist)).mtimeMs - fs.statSync(new URL(b, dist)).mtimeMs).at(-1);
if (!apkName) throw new Error('No Qingheng APK found in dist');
const apk = fs.readFileSync(new URL(apkName, dist));
const entries = new Map();
for (let i = 0; i < apk.length - 4; i++) {
  if (apk.readUInt32LE(i) !== 0x04034b50) continue;
  const method = apk.readUInt16LE(i + 8);
  const compSize = apk.readUInt32LE(i + 18);
  const nameLen = apk.readUInt16LE(i + 26);
  const extraLen = apk.readUInt16LE(i + 28);
  const name = apk.slice(i + 30, i + 30 + nameLen).toString('utf8');
  const start = i + 30 + nameLen + extraLen;
  if (start + compSize > apk.length) continue;
  const raw = apk.slice(start, start + compSize);
  entries.set(name, method === 0 ? raw : zlib.inflateRawSync(raw));
}
const names = [...entries.keys()];

// aapt2 on Windows emits backslash separators for asset sub-directories, which Android's
// AssetManager cannot resolve, so a nested asset silently 404s on the device.
assert.deepEqual(names.filter(n => n.includes('\\')), [], 'no APK entry may use a backslash separator');
assert(names.includes('assets/icon-glyph-camera.svg'), 'camera glyph ships flat');
assert(names.includes('assets/icon-gallery.svg'), 'gallery icon ships flat');
assert(names.includes('assets/food-models.js'), 'food library ships');
assert(!names.some(n => n.startsWith('assets/icons/')), 'no nested asset directory ships');

const html = entries.get('assets/index.html').toString('utf8');
assert(html.includes('./icon-glyph-camera.svg') && html.includes('./icon-gallery.svg'), 'page references the flat icons');
assert(html.indexOf('food-models.js') < html.indexOf('native-adapter.js'), 'food library loads before the adapter');
assert(html.includes('id="connection-check"'), 'connection check ships');

const svg = entries.get('assets/icon-glyph-camera.svg').toString('utf8');
assert(svg.startsWith('<svg') && svg.includes('</svg>'), 'camera icon is a complete SVG document');
assert(!svg.includes('<script'), 'icons carry no script');

// Run the packaged food library itself, exactly as the WebView would load it.
const context = vm.createContext({ window: {}, globalThis: {}, JSON, Math, Number, Object, Array, Map, Set, RangeError, TypeError, Error, isFinite, Date });
vm.runInContext(entries.get('assets/food-models.js').toString('utf8'), context);
const foods = context.globalThis.QinghengFoods;
assert(foods && Array.isArray(foods.entries), 'packaged library exposes entries');
assert(foods.entries.length >= 80, `packaged library keeps the catalogue (got ${foods.entries.length})`);
for (const anchor of ['米饭', '鸡胸肉', '西兰花', '鸡蛋', '燕麦', '牛奶', '香蕉', '苹果', '土豆', '豆腐', '橄榄油', '食用油']) {
  assert(foods.find(anchor), `compatibility anchor survives packaging: ${anchor}`);
}
const meal = foods.calibrateDraft({ items: [{ name: '米饭', grams: 150 }, { name: '番茄炒蛋', grams: 200 }, { name: '未知料理', grams: 100 }] });
assert.equal(meal.items.length, 3, 'all items preserved');
assert.equal(meal.items[2].name, '未知料理', 'unknown food is never replaced');
assert.equal(meal.model.matchedItems, 2);
assert.equal(meal.model.unknownItems, 1);
assert.equal(meal.items[0].model.includesOil, false);
assert.equal(meal.items[1].model.includesOil, true);
// An unknown item without nutrition must make the total unknown, never silently zero.
assert.equal(meal.totals.calories, null, 'a missing nutrient keeps the total unknown, not zero');
const known = foods.calibrateDraft({ items: [{ name: '米饭', grams: 150 }, { name: '番茄炒蛋', grams: 200 }] });
assert(known.totals.calories > 0, 'fully matched drafts produce real totals');
const again = foods.calibrateDraft(known);
assert.deepEqual(JSON.parse(JSON.stringify(again.totals)), JSON.parse(JSON.stringify(known.totals)), 'calibration is idempotent');
assert.throws(() => foods.estimate('不存在的食物', 100), 'unknown foods are refused');

console.log('PASS packaged APK: flat assets, shipped icons, and the packaged food library behave as tested');
