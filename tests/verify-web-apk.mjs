import fs from 'node:fs';
import zlib from 'node:zlib';
const apkName = fs.readdirSync('dist').filter(name => /^qingheng-.*\.apk$/.test(name))
  .sort((a, b) => fs.statSync('dist/' + a).mtimeMs - fs.statSync('dist/' + b).mtimeMs).at(-1);
if (!apkName) throw new Error('No Qingheng APK found in dist');
const apk = fs.readFileSync('dist/' + apkName);
const names = [];
const data = [];
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
  data.push(method === 0 ? raw : zlib.inflateRawSync(raw));
}
// DEX and JS both store these literals as UTF-8 bytes, so compare bytes, not a decoded string.
const blob = Buffer.concat(data);
const has = text => blob.includes(Buffer.from(text, 'utf8'));
const ascii = text => Buffer.concat(data).includes(Buffer.from(text, 'latin1'));

const checks = {
  'no backslash entries': names.filter(n => n.includes('\\')).length === 0,
  'chat history is deleted from the long-press sheet': has('data-long-press') && has('data-chat-toggle'),
  'chat rows carry no inline delete control': !has('data-delete-chat'),
  'open food facts host in dex': ascii('search.openfoodfacts.org'),
  'food search route in dex': ascii('/api/food-search'),
  'odbl attribution in page': has('ODbL'),
  'removed url feature absent': !has('WebPageFetch') && !ascii('/api/fetch-page'),
  'BraveSearch absent from dex': !has('BraveSearch'),
  'brave host absent from dex': !ascii('api.search.brave.com'),
  'search settings route absent': !ascii('/api/search-settings'),
  'search test route absent': !ascii('/api/search-test'),
  'search tool name absent': !ascii('web_search'),
  'push advice history in page': has('push-history') && has('query-push-history'),
  'search controls absent from page': !has('search-form') && !has('search-test'),
  'chat context carries the analysed day': has('selectedDate') && ascii('recordPolicy'),
  'chat context reports per-day meal counts': ascii('mealCount'),
  'packaged page exposes the editable meal date': has('estimate-date') && has('estimate-photo-time'),
  'packaged page separates capture time from the meal date': has('拍摄时间不等于进餐日期'),
  'photo provenance is whitelisted in dex': ascii('photoTimeSource') && ascii('exif-local'),
};
for (const [k, v] of Object.entries(checks)) console.log((v ? 'OK   ' : 'FAIL ') + k);
const bad = Object.entries(checks).filter(([, v]) => !v);
console.log(bad.length ? 'PACKAGED CHECK FAILED: ' + bad.map(b => b[0]).join(', ') : 'PACKAGED CHECK PASSED');
process.exit(bad.length ? 1 : 0);
