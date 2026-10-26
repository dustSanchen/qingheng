import fs from 'node:fs';
let t = fs.readFileSync('tests/training-library.test.mjs','utf8');
if (!t.includes('back rules from the handbook')) {
  t = t.replace("console.log('\\nFAIL total: ' + fail);",
`check('back rules from the handbook', ['traps-grow-by-retraction','row-scapula-depends-on-goal','teres-major-is-small-lat','scapular-depression-before-pull'].every(id => earlyIds.has(id)));
check('the traps rule names the retraction movement', lib.rules.find(r => r.id === 'traps-grow-by-retraction').plan.movement === 'scapular-retraction');
check('the teres rule keeps the alias', lib.rules.find(r => r.id === 'teres-major-is-small-lat').plan.alias === '小背阔肌');
check('the library now holds the five-episode batch', lib.rules.filter(r => r.evidence && r.evidence.bvid === 'BV1jEnuz9ESc').length >= 4);
console.log('\\nFAIL total: ' + fail);`);
  fs.writeFileSync('tests/training-library.test.mjs', t);
}
console.log('ep4 assertions added');
