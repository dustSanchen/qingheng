import fs from 'node:fs';
let t = fs.readFileSync('tests/training-library.test.mjs','utf8');
if (!t.includes('preview infers missing carbs')) {
  t = t.replace("console.log('\\nFAIL total: ' + fail);",
`const rest = fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8');
const carbStart2 = rest.indexOf('function carbOfItem');
const carbEnd2 = rest.indexOf('\\n  }', carbStart2) + 4;
const runItemCarb = new Function('number', rest.slice(carbStart2, carbEnd2) + '\\nreturn carbOfItem;')(v => v === null || v === undefined || v === '' ? null : Number(v));
check('preview infers missing carbs', runItemCarb({calories: 261, protein: 5.3, fat: 0.6, carbs: 0}) === 58.6, String(runItemCarb({calories: 261, protein: 5.3, fat: 0.6, carbs: 0})));
check('preview keeps a stated carb value', runItemCarb({calories: 261, protein: 5.3, fat: 0.6, carbs: 57}) === 57);
check('preview leaves protein/fat-only rows alone', runItemCarb({calories: 40, protein: 8, fat: 1, carbs: null}) === 0);
console.log('\\nFAIL total: ' + fail);`);
  fs.writeFileSync('tests/training-library.test.mjs', t);
}
console.log('preview assertions added');
