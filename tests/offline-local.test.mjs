/**
 * Offline/no-key guarantees: local food matching and preference storage must not
 * depend on an external model, and a local preview still needs confirmation.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const adapter = fs.readFileSync('app/src/main/assets/native-adapter.js', 'utf8');

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing ' + name);
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

const local = extractFunction(app, 'localFoodEstimate');
const start = app.indexOf('function localFoodEstimate(');
check('local matching is self-contained', start >= 0 && !/api\(|fetch\(|allowExternal|apiKey/i.test(local));
check('unknown local lines fall through', local.includes('if (!entry) return null') && local.includes('if (!match) return null'));
check('local results still require the estimate preview', app.includes('previewDraft(local, submittedForm)') && app.includes('生成估算预览'));
check('the generic draft writer refuses meal', app.includes("if (draft.kind === 'meal')") && app.includes('餐食草稿需要在餐食表单生成预览并确认'));
check('preferences are object-array backed, not string+meta', app.includes('normalizePreferenceEntries') && app.includes('localStorage.removeItem(PREFERENCE_META_KEY)'));
check('readPreferences returns text while rows keep metadata', app.includes('return readPreferenceEntries().map(row => row.text);') && app.includes('function readPreferenceRows()'));
check('no API key is written into preference storage', !/localStorage\.setItem\([^)]*apiKey/i.test(app));
check('the browser adapter has a local estimate path', adapter.includes("path==='/api/estimate'") && adapter.includes('QinghengFoods'));
check('offline copy does not claim a meal was saved', app.includes('请检查数据后确认保存'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
