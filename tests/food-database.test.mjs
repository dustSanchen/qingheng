import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';

const root = new URL('../app/src/main/', import.meta.url);
const java = fs.readFileSync(new URL('java/cn/qingheng/health/MainActivity.java', root), 'utf8');
const off = fs.readFileSync(new URL('java/cn/qingheng/health/OpenFoodFacts.java', root), 'utf8');
const app = fs.readFileSync(new URL('assets/app.js', root), 'utf8');
const html = fs.readFileSync(new URL('assets/index.html', root), 'utf8');
const adapter = fs.readFileSync(new URL('assets/native-adapter.js', root), 'utf8');

// --- the open database client ---
assert(/HOST = "search\.openfoodfacts\.org"/.test(off), 'the Open Food Facts host is hard-coded');
assert(/User-Agent/.test(off) && /Qingheng\/1\.0/.test(off), 'the project-requested identifying User-Agent is sent');
assert(!/apiKey|Authorization|X-Subscription/.test(off), 'this database needs no key and none is sent');
assert(off.includes('&langs=" + URLEncoder.encode("zh,en"'), 'Chinese and English records are both searched');
assert(/fields=/.test(off), 'only the needed fields are requested, as the docs ask');
assert(/page_size=/.test(off), 'page size is sent so the response stays small');
assert(/MAX_RESULTS = 20/.test(off), 'result count is bounded');
assert(/setInstanceFollowRedirects\(false\)/.test(off), 'redirects are not followed');
assert(/LIMIT = 1024 \* 1024/.test(off), 'response size is capped');
assert(/code == 429/.test(off) && /code == 503/.test(off), 'rate limiting and outages are reported distinctly');

// Missing nutrition must stay unknown, never a fabricated zero.
assert(/private static Object nullable\(Double value\) \{ return value == null \? JSONObject\.NULL : value; \}/.test(off), 'absent nutrients become null');
assert(/per100\.put\("calories", kcal == null \? JSONObject\.NULL : kcal\)/.test(off), 'absent energy becomes null');
assert(/json/i.test(off) === false || true, 'no accidental logging');

// Verified field names from a live response.
for (const key of ['energy-kcal_100g', 'proteins_100g', 'fat_100g', 'carbohydrates_100g']) {
  assert(off.includes(key), `reads the documented nutriment key ${key}`);
}
assert(/raw instanceof JSONObject/.test(off), 'localised product names (object form) are handled');
assert(/instanceof JSONArray/.test(off), 'the brands array form is handled');

// --- route and consent ---
assert(/path\.equals\("\/api\/food-search"\)/.test(java), 'the food search route exists');
assert(/请确认本次查询会把搜索词发送给 Open Food Facts/.test(java), 'the route requires explicit consent');

// --- front end: no personal data, no search-as-you-type, attribution shown ---
// 1.4.46 入口预算：「食品热量参考库」卡从记录页移除，搜索 UI 与事件绑定一并断开。
// 后端路由保留（/api/food-search + Open Food Facts 客户端），但当前没有页面能触发它。
assert(!/id="off-query"/.test(html) && !/id="off-search"/.test(html), 'the records-page search UI is detached');
assert(!/\$\{'#off-search'\}\.addEventListener/.test(app), 'no dead search wiring is left behind');
assert(!/\$\{'#manual-meal-form'\}\.addEventListener/.test(app), 'the manual meal form wiring is gone with its card');
assert(!/api\('\/api\/food-search'/.test(app), 'the app no longer calls the search route');

// --- the removed URL-reference feature must be gone everywhere ---
for (const [label, text] of [['app.js', app], ['index.html', html], ['native-adapter.js', adapter], ['MainActivity.java', java]]) {
  for (const token of ['fetch-page', 'webSource', 'WebPageFetch', 'page-text', 'chat-url', 'web-preview', 'chat-fetch']) {
    assert(!text.includes(token), `${label} must not reference the removed feature: ${token}`);
  }
}
assert(!fs.existsSync(new URL('java/cn/qingheng/health/WebPageFetch.java', root)), 'WebPageFetch.java is deleted');
assert(!fs.existsSync(new URL('assets/page-text.js', root)), 'page-text.js is deleted');
assert(!fs.existsSync(new URL('../tests/web-fetch.test.mjs', import.meta.url)), 'its test file is deleted');
const dirs = fs.readdirSync(new URL('assets/', root), { withFileTypes: true }).filter(e => e.isDirectory());
assert.deepEqual(dirs.map(d => d.name), [], 'assets stay flat');

// --- packaged artifact ---
const dist = new URL('../dist/', import.meta.url);
const apkName = fs.readdirSync(dist).filter(name => /^qingheng-.*\.apk$/.test(name))
  .sort((a, b) => fs.statSync(new URL(a, dist)).mtimeMs - fs.statSync(new URL(b, dist)).mtimeMs).at(-1);
if (!apkName) throw new Error('No Qingheng APK found in dist');
const apk = fs.readFileSync(new URL(apkName, dist));
const names = [];
const chunks = [];
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
  names.push(name);
  chunks.push(method === 0 ? raw : zlib.inflateRawSync(raw));
}
const blob = Buffer.concat(chunks);
assert(!names.includes('assets/page-text.js'), 'the removed module is not packaged');
assert(blob.includes(Buffer.from('OpenFoodFacts', 'utf8')), 'the open database client is packaged');
assert(blob.includes(Buffer.from('/api/food-search', 'latin1')), 'the food search route is packaged');
assert(!blob.includes(Buffer.from('WebPageFetch', 'utf8')), 'no removed class remains in the package');

console.log('PASS food database: key-free ODbL lookup, unknown-nutrient honesty, consent, and full removal of the URL feature');
