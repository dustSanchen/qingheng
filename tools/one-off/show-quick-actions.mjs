import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/70-rest.fragment.js','utf8');
let i = t.indexOf('function installTodayQuickActions');
console.log(t.slice(i, i + 1500));
console.log('=== revealField ===');
const j = t.indexOf('function revealField');
console.log(t.slice(j, j + 520));
