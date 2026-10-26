import fs from 'node:fs';
const f = 'tests/training-library.test.mjs';
let t = fs.readFileSync(f,'utf8');
t = t.replace("check('the library now cites ten sources', lib.sources.length === 10, String(lib.sources.length));",
"check('the library now cites twelve sources', lib.sources.length === 12, String(lib.sources.length));");
if (!t.includes('chinese guideline rules')) {
  t = t.replace("console.log('\\nFAIL total: ' + fail);",
`check('chinese guideline rules', ['cdg-salt-oil-sugar','cdg-veg-fruit-dairy','cdg-protein-foods','cdg-staple-variety','cdg-activity-week','cdg-water','cdg-eating-out','cdg-oil-fits-fat-floor','csr-average-seven-four'].every(id => earlyIds.has(id)));
check('the salt limit is five grams', lib.rules.find(r => r.id === 'cdg-salt-oil-sugar').plan.saltG === 5);
check('oil is 25 to 30 grams', lib.rules.find(r => r.id === 'cdg-salt-oil-sugar').plan.oilG[1] === 30);
check('weekly activity is 150 minutes', lib.rules.find(r => r.id === 'cdg-activity-week').plan.moderateMinutes === 150);
check('the sleep report figure is recorded', lib.rules.find(r => r.id === 'csr-average-seven-four').plan.meanHours === 7.4);
check('the oil rule reconciles the fat floor', lib.rules.find(r => r.id === 'cdg-oil-fits-fat-floor').plan.fatFloorG === 55);
check('priority starts with the chinese guide', lib.priority[0] === 'cdg-2022');
console.log('\\nFAIL total: ' + fail);`);
  fs.writeFileSync(f, t);
}
console.log('assertions added');
