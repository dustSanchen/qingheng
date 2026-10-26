import fs from 'node:fs';
let t = fs.readFileSync('tests/graded-colors.test.mjs','utf8');
t = t.replace("check('unrecorded days stay transparent', app.includes(\"recorded ? goalColor(ratio) : 'transparent'\"));",
  "check('unrecorded days stay transparent', app.includes(\"recorded ? dietBarColor(kcal, range.min, range.max) : 'transparent'\"));");
t = t.replace("check('growth is measured as a share of last volume', app.includes('row.delta / row.prevVolume'));",
  "check('growth is measured as a share of last volume', app.includes('const pct = previous > 0 ? delta / previous : 0;'));");
fs.writeFileSync('tests/graded-colors.test.mjs', t);
console.log('two assertions fixed');
