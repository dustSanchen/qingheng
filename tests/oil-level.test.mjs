/**
 * Oil-level changes must be reversible and non-negative, including when the row was
 * manually edited or already carried a different amount of oil.
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
const adjust = new Function('number', extractFunction(app, 'oilAdjustedValues') + '\nreturn oilAdjustedValues;')(number);

let out = adjust(180, 20, 9, 5.4);
check('normal -> low removes only the difference and stays positive', out.calories === 148 && out.fat === 16.4, out);
out = adjust(180, 3, 9, 5.4);
check('a row whose fat is below the old oil estimate cannot go negative', out.calories === 148 && out.fat === 5.4, out);
out = adjust(100, 10, 0, 5.4);
check('a row without old oil gets the new oil added', out.calories === 149 && out.fat === 15.4, out);
out = adjust(50, 2, 3, 1.8);
check('the result is rounded to display precision', out.calories === 39 && out.fat === 1.8, out);
check('the setter uses the row actual oil, not the previous ratio', app.includes("number(row.dataset.oil) ?? number(raw.oilGrams) ?? 0") && app.includes('oilAdjustedValues(cal && cal.value, fat && fat.value, oldOil, newOil)'));
check('gram edits scale the row oil marker with the row calories', app.includes('row.dataset.oil = String(Math.round(oil * ratio * 10) / 10)'));
check('saved/mixed dishes with included oil are skipped', app.includes('if (raw.oilIncluded === true) return;'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
