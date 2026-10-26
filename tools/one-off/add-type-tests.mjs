import fs from 'node:fs';
const t = fs.readFileSync('tests/training-library.test.mjs','utf8');
if (!t.includes('the four type levels exist')) {
  let s = t.replace("console.log('\\nFAIL total: ' + fail);",
`const sheet = fs.readFileSync('app/src/main/assets/styles.css','utf8');
check('the four type levels exist', ['.t-page','.t-card','.t-body','.t-note'].every(c => sheet.includes(c)));
check('smallest text is readable', !/font-size:\\s*(9|10|10\\.5|11\\.5|12)px/.test(sheet));
check('form controls inherit the body font', /button,input,select,textarea\\{font-family:var\\(--font-ui\\)/.test(sheet));
check('only two font families are declared', (sheet.match(/font-family:/g) || []).length === (sheet.match(/font-family:\\s*var\\(--font-/g) || []).length + 2, String((sheet.match(/font-family:/g) || []).length));
console.log('\\nFAIL total: ' + fail);`);
  fs.writeFileSync('tests/training-library.test.mjs', s);
  console.log('type assertions added');
}
