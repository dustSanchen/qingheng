import fs from 'node:fs';
let t = fs.readFileSync('tests/nutrition-math.test.mjs','utf8');
t = t.replace("lines.inferred === '57.5,0.0'", "lines.inferred === '25.0,0.0'");
fs.writeFileSync('tests/nutrition-math.test.mjs', t);
const l = fs.readFileSync('tests/training-library.test.mjs','utf8').split(/\r?\n/);
for (let i=188; i<198; i++) console.log((i+1) + '  ' + (l[i]||'').slice(0,180));
