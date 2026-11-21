/**
 * Preference compatibility (1.4.72): strings remain the portable source of truth;
 * source/timestamps live beside them and old backups never need a schema migration.
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
  extractFunction(app, 'readPreferences') + '\n' +
  extractFunction(app, 'writePreferences') + '\n' +
  extractFunction(app, 'preferenceIdFor') + '\n' +
  extractFunction(app, 'preferenceTimestamp') + '\n' +
  extractFunction(app, 'readPreferenceMeta') + '\n' +
  extractFunction(app, 'readPreferenceRows') + '\n' +
  extractFunction(app, 'writePreferenceRows') + '\n' +
  'return {readPreferences, writePreferences, preferenceIdFor, readPreferenceMeta, readPreferenceRows, writePreferenceRows};'
);
const store = new Map();
const localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value))
};
const api = factory(localStorage);

store.set('qingheng.preferences', JSON.stringify(['不吃香菜', '早餐固定两个鸡蛋加豆浆']));
let rows = api.readPreferenceRows();
check('old string preferences remain readable', rows.length === 2, rows.length);
check('legacy strings are labelled, not given a fake date', rows[0].source === 'legacy' && rows[0].createdAt === null, rows[0]);
check('legacy ids are stable', rows[0].id === api.preferenceIdFor('不吃香菜'), rows[0].id);

const now = new Date().toISOString();
api.writePreferenceRows([
  {id: 'pref-a', text: '不吃香菜', source: 'chat', createdAt: now, updatedAt: now},
  {id: 'pref-b', text: '早餐固定两个鸡蛋加豆浆', source: 'manual', createdAt: now, updatedAt: now}
]);
rows = api.readPreferenceRows();
check('the authoritative storage is still a string array', JSON.parse(store.get('qingheng.preferences')).every(value => typeof value === 'string'));
check('source metadata is kept beside the strings', rows[0].source === 'chat' && rows[1].source === 'manual', rows.map(row => row.source).join(','));
check('timestamps are preserved', rows[0].createdAt === now && rows[0].updatedAt === now, rows[0].createdAt);
check('metadata does not change the prompt payload', JSON.stringify(api.readPreferences()) === JSON.stringify(['不吃香菜', '早餐固定两个鸡蛋加豆浆']));

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
check('the twenty-item cap is preserved', api.readPreferences().length === 20, api.readPreferences().length);

store.set('qingheng.preferences', 'not json');
check('broken JSON returns an empty list instead of crashing', api.readPreferences().length === 0);

store.set('qingheng.preferences', JSON.stringify(['__proto__', '正常偏好']));
store.set('qingheng.preferenceMeta', JSON.stringify({'__proto__': {source: 'manual'}}));
rows = api.readPreferenceRows();
check('hostile text cannot pollute the metadata object', rows.length === 2 && rows[1].text === '正常偏好', rows.map(row => row.text).join(','));

check('the UI reads merged rows and exposes edit/delete', app.includes('readPreferenceRows()') && app.includes('data-preference-edit') && app.includes('data-preference-remove'));
check('the UI shows source and time, with the three consumers stated once', app.includes('preferenceMetaText') && html.includes('用于估算、建议和训练问答'));
check('editing is an inline form with a cancel action', html.includes('id="preference-cancel"') && app.includes('beginPreferenceEdit') && app.includes("input.focus({preventScroll: true})"));
check('the preference list has a dedicated action layout', css.includes('.preference-row-actions'));
check('preferences and metadata enter the portable config registry', app.includes("{id: 'preferences'") && app.includes("{id: 'preferenceMeta'"));
check('loading state restores both preference arrays', app.includes('prefs.preferences') && app.includes('prefs.preferenceMeta'));
check('advice preview includes the same preference text', app.includes('payload.preferences = readPreferences()') && main.includes('adviceSystemPrompt() + preferenceSuffix(b)'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
