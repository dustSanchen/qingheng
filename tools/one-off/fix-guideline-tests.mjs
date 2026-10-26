import fs from 'node:fs';
const f = 'tests/training-library.test.mjs';
let t = fs.readFileSync(f,'utf8');
t = t.replace("check('priority starts with the transcript source', lib.priority[0] === 'asr-transcript');",
"check('priority starts with the ISSN stand', lib.priority[0] === 'issn-2017');");
t = t.replace("check('the library is now seven sources', lib.sources.length === 7, String(lib.sources.length));",
"check('the library now cites ten sources', lib.sources.length === 10, String(lib.sources.length));");
if (!t.includes('guideline citations')) {
  t = t.replace("console.log('\\nFAIL total: ' + fail);",
`check('guideline citations', ['issn-2017','helms-2014','aasm-2015'].every(id => lib.sources.some(s => s.id === id)));
check('the protein range matches the stand', lib.rules.find(r => r.id === 'protein-general-range').claim.includes('1.4~2.0'));
check('the deficit protein band is cited', lib.rules.find(r => r.id === 'protein-deficit-range').plan.deficitRange[1] === 3.1);
check('per-meal protein is cited', lib.rules.find(r => r.id === 'protein-per-meal').plan.perMealG[1] === 40);
check('sleep consensus cites seven hours', lib.rules.find(r => r.id === 'sleep-duration-consensus').plan.minHours === 7);
check('formula error is acknowledged', lib.rules.find(r => r.id === 'tdee-formula-error').plan.formulaErrorPercent[1] === 20);
check('guideline rules carry a citation object', lib.rules.filter(r => r.citation).length >= 8, String(lib.rules.filter(r => r.citation).length));
check('the app has design tokens', fs.readFileSync('app/src/main/assets/styles.css','utf8').includes('--space-4:16px'));
console.log('\\nFAIL total: ' + fail);`);
  fs.writeFileSync(f, t);
}
console.log('assertions updated');
