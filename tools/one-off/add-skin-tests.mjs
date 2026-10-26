import fs from 'node:fs';
const f = 'tests/training-library.test.mjs';
let t = fs.readFileSync(f, 'utf8');
if (!t.includes('both skins define the same tokens')) {
  t = t.replace("console.log('\\nFAIL total: ' + fail);",
`const sheet2 = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const skinBlock = (sheet2.match(/\\[data-skin="ledger"\\]\\{([\\s\\S]*?)\\}/) || [])[1] || '';
const baseBlock = (sheet2.match(/:root\\{([\\s\\S]*?)\\}/) || [])[1] || '';
const required = ['--paper','--surface','--line','--ink','--body-text','--muted','--radius-lg','--measure'];
check('both skins define the same tokens', required.every(k => baseBlock.includes(k + ':') && (skinBlock.includes(k + ':') || k === '--measure')), required.filter(k => !skinBlock.includes(k + ':')).join(','));
check('the skin switcher exists', frags.includes('installSkinPicker') && frags.includes('data-skin-pick'));
check('the skin persists', frags.includes("localStorage.setItem(SKIN_KEY"));
check('ledger swaps the display font for sans', /\\[data-skin="ledger"\\][\\s\\S]{0,400}--font-display:var\\(--font-ui\\)/.test(sheet2));
console.log('\\nFAIL total: ' + fail);`);
  fs.writeFileSync(f, t);
  console.log('skin assertions added');
}
