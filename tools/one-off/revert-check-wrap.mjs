import fs from 'node:fs';
const f = 'app/src/fragments/60-training-copy.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const from = "  box.innerHTML = annotateTerms('<div class=\"check-grid\">' + check.items.map(item =>";
const to = "  box.innerHTML = '<div class=\"check-grid\">' + check.items.map(item =>";
if (!t.includes(from)) { console.log('MISS revert anchor'); process.exit(1); }
fs.writeFileSync(f, t.replace(from, to));
console.log('reverted check-body wrap');
