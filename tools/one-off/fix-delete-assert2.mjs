import fs from 'node:fs';
let t = fs.readFileSync('tests/meal-date-context.test.mjs','utf8');
t = t.replace('/\\.row-side"><span class="row-kcal">/', '/class="row-side"><span class="row-kcal">/');
fs.writeFileSync('tests/meal-date-context.test.mjs', t);
console.log('regex fixed');
