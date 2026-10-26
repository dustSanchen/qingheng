import fs from 'node:fs';
let t = fs.readFileSync('tests/layout-four.test.mjs','utf8');
t = t.replace("check('a real date shift helper exists', app.includes('function shiftDate(day, delta)'));",
"check('a real date shift helper exists', app.includes('function shiftDate(day, delta)'));\ncheck('the diet card is filled on every render', app.includes('function renderDietTrend()') && app.includes('if (typeof renderDietTrend === \'function\') renderDietTrend();'));");
fs.writeFileSync('tests/layout-four.test.mjs', t);
console.log('assertion added');
