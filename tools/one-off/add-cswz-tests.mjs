import fs from 'node:fs';
const f = 'tests/training-library.test.mjs';
let t = fs.readFileSync(f,'utf8');
t = t.replace("check('the library now cites twelve sources', lib.sources.length === 12, String(lib.sources.length));",
"check('the library now cites thirteen sources', lib.sources.length === 13, String(lib.sources.length));");
if (!t.includes('obesity guidance rules')) {
  t = t.replace("console.log('\\nFAIL total: ' + fail);",
`check('obesity guidance rules', ['cswz-energy-deficit','cswz-macro-split','cswz-loss-rate','cswz-activity-dose','cswz-sleep-seven-23','cswz-food-portions','cswz-meal-order','cswz-oil-salt-tight','cswz-alcohol-cost','cswz-scope-vs-app-floor'].every(id => earlyIds.has(id)));
check('the guide keeps the app floor separate', lib.rules.find(r => r.id === 'cswz-scope-vs-app-floor').plan.appFloor === 2000);
check('the loss rate is 0.5 to 1 kg a week', lib.rules.find(r => r.id === 'cswz-loss-rate').plan.weeklyKg[1] === 1);
check('cardio is 150 to 300 minutes', lib.rules.find(r => r.id === 'cswz-activity-dose').plan.cardioMinutes[1] === 300);
check('meal order starts with vegetables', lib.rules.find(r => r.id === 'cswz-meal-order').plan.order[0] === '蔬菜');
check('alcohol is seven kcal a gram', lib.rules.find(r => r.id === 'cswz-alcohol-cost').plan.kcalPerGram === 7);
const cssText = fs.readFileSync('app/src/main/assets/styles.css','utf8');
check('metrics use tabular numbers', cssText.includes('font-variant-numeric:tabular-nums'));
check('reduced motion is respected', cssText.includes('prefers-reduced-motion'));
check('focus is visible', cssText.includes(':focus-visible'));
check('the design notes are recorded', typeof lib.designNotes === 'object' && lib.designNotes.basis.length > 10);
console.log('\\nFAIL total: ' + fail);`);
  fs.writeFileSync(f, t);
}
console.log('assertions added');
