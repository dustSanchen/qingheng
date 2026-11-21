/**
 * Saved-meal editing (1.4.74): reuse the estimate preview without creating a duplicate row.
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
const mealEditView = new Function(extractFunction(app, 'mealEditView') + '\nreturn mealEditView;')();
const record = {
  id: 'meal-1', date: '2026-11-20', mealType: 'lunch', mealTime: '12:30',
  name: '米饭和鸡胸', source: 'api', items: [{name: '米饭', grams: 150, calories: 174}],
  protein: 10, fat: 3, carbs: 30, oilGrams: 4, uncertaintyPercent: 20,
  photoTakenAt: '2026-11-20T12:00:00+08:00', photoTimeSource: 'camera'
};
const view = mealEditView(record);
check('a saved meal becomes an edit preview', !!view && view.editingId === 'meal-1', view && view.editingId);
check('the saved nutrition and name are preserved', view.name === record.name && view.items[0].calories === 174);
check('the record id is not replaced by a draft id', view.id === record.id && view.editingId === record.id);
check('the original record is not mutated by building the view', record.items[0].name === '米饭' && view.items !== record.items);
check('a record without items cannot be edited', mealEditView({id: 'x', name: '空'}) === null);
check('the edit button is exposed on meal rows', app.includes('data-edit-meal') && app.includes('data-edit-meal="${esc(meal.id)}"'));
check('the edit button has a 44px target', css.includes('.row-edit{') && css.includes('min-height:44px'));
check('opening an edit preview uses the existing preview renderer', app.includes('function beginMealEdit(record)') && app.includes('renderPreview(view, true)'));
check('editing preserves stored oil instead of applying it again', app.includes('const oiledItems = view.editingId ? estimateRawItems : applyOilToItems(estimateRawItems, estimateOilLevel)'));
check('confirming an edit updates by id', app.includes("if (editing) await api('/api/meals',{...editing,id:editing.id,...values})"));
check('a normal estimate still uses estimateId idempotency', app.includes("else await api('/api/meals',{estimateId:draft.id,...values})"));
check('discarding an edit does not delete the saved meal', app.includes('const id=draft?.id, editing=!!draft?.editingId') && app.includes('if(!editing)dropDraft(id)'));
check('the row edit click resolves the saved record id', app.includes("document.addEventListener('click', event =>") && app.includes('beginMealEdit(record)'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
