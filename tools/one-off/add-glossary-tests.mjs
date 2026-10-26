import fs from 'node:fs';
const f = 'tests/training-library.test.mjs';
let t = fs.readFileSync(f, 'utf8');
if (!t.includes('the glossary covers core terms')) {
  t = t.replace("console.log('\\nFAIL total: ' + fail);",
`const appJs = fs.readFileSync('app/src/main/assets/app.js','utf8');
const idxHtml = fs.readFileSync('app/src/main/assets/index.html','utf8');
check('the glossary covers core terms', ['RPE','RM','ACWR','TDEE','减载','渐进超负荷','力竭'].every(k => appJs.includes('"' + k + '": {full:')));
check('terms are annotated into the plan', appJs.includes('annotateTerms(') && appJs.includes('plan-cue'));
check('the term sheet exists', idxHtml.includes('id="term-sheet"') && appJs.includes('function openTerm'));
check('every term has a caution', (appJs.match(/caution: "/g) || []).length >= 7, String((appJs.match(/caution: "/g) || []).length));
check('the notes collapse exists', idxHtml.includes('class="card-notes"'));
console.log('\\nFAIL total: ' + fail);`);
  fs.writeFileSync(f, t);
  console.log('glossary assertions added');
}
