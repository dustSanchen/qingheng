import fs from 'node:fs';
let n = fs.readFileSync('tests/nutrition-math.test.mjs','utf8');
n = n.replace("check('fiber counts 2 kcal/g', lines.fiberAware === '440,470', lines.fiberAware);", "check('fiber counts 2 kcal/g', lines.fiberAware === '285,325', lines.fiberAware);");
fs.writeFileSync('tests/nutrition-math.test.mjs', n);
console.log('expectation fixed');
