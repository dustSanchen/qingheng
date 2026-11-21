/**
 * Model output is untrusted: reject overlong names, non-boolean values, oversized
 * rows, extra notes, and malformed draft ids before preview or write.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '';
  for (let i = open; i < source.length; i++) {
    const ch = source[i], prev = source[i - 1];
    if (quote) { if (ch === quote && prev !== '\\') quote = ''; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated ' + name);
}
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const valid = new Function('number', 'ESTIMATE_LIMITS', extractFunction(app, 'validEstimateItem') + '\nreturn validEstimateItem;')(number, {name: 120, grams: 20000, calories: 100000, macros: 1000});
const base = {name: '米饭', grams: 100, calories: 130, protein: 2, fat: 0.3, carbs: 28};
check('a normal row passes', valid(base) === true);
check('a 121-character name is rejected', valid({...base, name: '米'.repeat(121)}) === false);
check('non-numeric nutrition is rejected', valid({...base, calories: 'lots'}) === false);
check('negative or oversized values are rejected', valid({...base, fat: -1}) === false && valid({...base, grams: 20001}) === false);
check('an array is not a row', valid([base]) === false);
check('preview uses the row validator', app.includes('data.items.every(validEstimateItem)') && app.includes('估算明细格式不对'));
check('notes are filtered and capped', app.includes('data.notes.filter(note => typeof note === \'string\'') && app.includes('slice(0, ESTIMATE_LIMITS.notes)'));
check('draft id has a length and type guard', app.includes('typeof data.draftId !== \'string\'') && app.includes('ESTIMATE_LIMITS.draftId'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
