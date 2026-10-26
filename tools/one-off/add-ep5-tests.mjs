import fs from 'node:fs';
let t = fs.readFileSync('tests/training-library.test.mjs','utf8');
if (!t.includes('arm rules from the handbook')) {
  t = t.replace("console.log('\\nFAIL total: ' + fail);",
`check('arm rules from the handbook', ['biceps-long-head-dual-joint','long-head-stretch-myth','triceps-heads-crossing','abs-blocks-are-genetic'].every(id => earlyIds.has(id)));
check('the myth rule is marked unproven', lib.rules.find(r => r.id === 'long-head-stretch-myth').plan.status === 'unproven');
check('every anatomy episode is cited', ['BV1mM6JY6Ei9','BV1YgcdeqE7y','BV167LAzaE14','BV1jEnuz9ESc','BV1X1Lj66ENe'].every(b => lib.rules.some(r => r.evidence && r.evidence.bvid === b)));
check('the library holds the whole handbook batch', lib.rules.filter(r => r.evidence).length >= 25, String(lib.rules.filter(r => r.evidence).length));
console.log('\\nFAIL total: ' + fail);`);
  fs.writeFileSync('tests/training-library.test.mjs', t);
}
console.log('ep5 assertions added');
