/**
 * Preferences are now stored as one object array; strings and the old
 * `preferenceMeta` map are read once and migrated without losing text or dates.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

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
  throw new Error('unterminated function ' + name);
}

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

const factory = new Function(
  'localStorage',
  'const PREFERENCES_KEY = "qingheng.preferences";\n' +
  'const PREFERENCE_META_KEY = "qingheng.preferenceMeta";\n' +
  'const PREFERENCE_SOURCES = ["manual", "chat", "legacy"];\n' +
  'function schedulePrefsSync() {}\n' +
  extractFunction(app, 'readLegacyPreferenceMeta') + '\n' +
  extractFunction(app, 'readPreferenceMeta') + '\n' +
  extractFunction(app, 'preferenceIdFor') + '\n' +
  extractFunction(app, 'preferenceTimestamp') + '\n' +
  extractFunction(app, 'normalizePreferenceEntries') + '\n' +
  extractFunction(app, 'readPreferenceEntries') + '\n' +
  extractFunction(app, 'readPreferences') + '\n' +
  extractFunction(app, 'readPreferenceRows') + '\n' +
  extractFunction(app, 'writePreferenceRows') + '\n' +
  extractFunction(app, 'writePreferences') + '\n' +
  extractFunction(app, 'ensurePreferenceStorage') + '\n' +
  'return {readPreferences, readPreferenceRows, readPreferenceMeta, normalizePreferenceEntries, writePreferenceRows, writePreferences, ensurePreferenceStorage};'
);
const store = new Map();
const localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key)
};
const api = factory(localStorage);

store.set('qingheng.preferences', JSON.stringify(['不吃香菜', '早餐固定两个鸡蛋加豆浆']));
let rows = api.readPreferenceRows();
check('old string preferences remain readable', rows.length === 2, rows.length);
check('legacy strings are labelled, not given a fake date', rows[0].source === 'legacy' && rows[0].createdAt === null, rows[0]);
check('legacy ids are stable', rows[0].id === api.readPreferenceRows()[0].id, rows[0].id);

const now = new Date().toISOString();
api.writePreferenceRows([
  {id: 'pref-a', text: '不吃香菜', source: 'chat', scope: 'all', createdAt: now, updatedAt: now},
  {id: 'pref-b', text: '早餐固定两个鸡蛋加豆浆', source: 'manual', scope: 'all', createdAt: now, updatedAt: now}
]);
const stored = JSON.parse(store.get('qingheng.preferences'));
check('the authoritative storage is an object array', Array.isArray(stored) && stored.every(value => value && typeof value === 'object' && typeof value.text === 'string'));
check('every object carries id, source and scope', stored.every(value => value.id && value.source && value.scope === 'all'));
check('the old metadata key is removed after writing objects', !store.has('qingheng.preferenceMeta'));
check('source and timestamps survive in the objects', stored[0].source === 'chat' && stored[0].createdAt === now);
check('prompt consumers still receive plain strings', JSON.stringify(api.readPreferences()) === JSON.stringify(['不吃香菜', '早餐固定两个鸡蛋加豆浆']));

rows = api.readPreferenceRows();
check('reading storage returns the same object array', rows.length === 2 && rows[1].text === '早餐固定两个鸡蛋加豆浆');
api.writePreferenceRows([...rows, {text: '晚上八点后不进食', source: 'manual'}]);
rows = api.readPreferenceRows();
check('a new string gets source and timestamp', rows[2].source === 'manual' && !!rows[2].createdAt, rows[2]);
check('deduplication keeps one copy', rows.filter(row => row.text === '不吃香菜').length === 1);

store.clear();
store.set('qingheng.preferences', JSON.stringify(['旧习惯']));
api.writePreferenceRows([{text: '旧习惯', source: 'legacy'}, {text: '新习惯', source: 'manual'}]);
rows = api.readPreferenceRows();
check('writing another row never invents a date for legacy text', rows[0].source === 'legacy' && rows[0].createdAt === null, rows[0]);
check('the newly added row still carries its time', rows[1].source === 'manual' && !!rows[1].createdAt, rows[1]);
api.writePreferenceRows(Array.from({length: 25}, (_, index) => ({text: '偏好 ' + index})));
check('the twenty-item cap is preserved', api.readPreferenceRows().length === 20, api.readPreferenceRows().length);

store.set('qingheng.preferences', 'not json');
check('broken JSON returns an empty list instead of crashing', api.readPreferenceRows().length === 0);

store.clear();
store.set('qingheng.preferences', JSON.stringify(['有来源']));
store.set('qingheng.preferenceMeta', JSON.stringify({'有来源': {source: 'chat', createdAt: now, updatedAt: now}}));
rows = api.readPreferenceRows();
check('the old metadata map is merged into the object', rows[0].source === 'chat' && rows[0].createdAt === now);
api.writePreferenceRows(rows);
check('migration removes the old metadata key', !store.has('qingheng.preferenceMeta') && Array.isArray(JSON.parse(store.get('qingheng.preferences'))));

store.clear();
store.set('qingheng.preferences', JSON.stringify(['待迁移']));
store.set('qingheng.preferenceMeta', JSON.stringify({'待迁移': {source: 'manual'}}));
check('startup migration upgrades string storage in place', api.ensurePreferenceStorage() === true);
check('startup migration leaves objects only', Array.isArray(JSON.parse(store.get('qingheng.preferences'))) && !store.has('qingheng.preferenceMeta'));

store.clear();
store.set('qingheng.preferences', JSON.stringify([{text: '__proto__', source: 'manual'}, {text: '正常偏好', source: 'legacy'}]));
rows = api.readPreferenceRows();
check('hostile text cannot pollute the object list', rows.length === 2 && rows[1].text === '正常偏好', rows.map(row => row.text).join(','));

check('the UI reads the object array and exposes edit/delete', app.includes('readPreferenceRows()') && app.includes('data-preference-edit') && app.includes('data-preference-remove'));
check('the UI shows source and time, with the three consumers stated once', app.includes('preferenceMetaText') && html.includes('用于估算、建议和训练问答'));
check('editing is an inline form with a cancel action', html.includes('id="preference-cancel"') && app.includes('beginPreferenceEdit') && app.includes("input.focus({preventScroll: true})"));
check('the preference list has a dedicated action layout', css.includes('.preference-row-actions'));
check('the portable config carries one object array, not a second meta map', app.includes("{id: 'preferences'") && !app.includes("{id: 'preferenceMeta'"));
check('loading normalizes old state into objects', app.includes('normalizePreferenceEntries(prefs.preferences, prefs.preferenceMeta)') && app.includes('localStorage.removeItem(PREFERENCE_META_KEY)'));
check('the Java prompt reader accepts both old strings and object text', main.includes('raw instanceof JSONObject') && main.includes('optString("text"'));
check('advice preview includes the same preference text', app.includes('payload.preferences = readPreferences()') && main.includes('adviceSystemPrompt() + preferenceSuffix(b)'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
