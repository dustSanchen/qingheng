import fs from 'node:fs';

let t = fs.readFileSync('tests/nutrition-math.test.mjs', 'utf8');
if (!t.includes('inferredCarbs')) {
  t = t.replace('        // 4/4/9 energy checks',
`        // carbs fallback when a food omits carbohydrate
        System.out.println("carbsMissing=" + NutritionMath.carbsMissing(400, 30, 0, 20) + "," + NutritionMath.carbsMissing(400, 30, 40, 20));
        System.out.println("inferred=" + String.format("%.1f", NutritionMath.inferredCarbs(400, 30, 20)) + "," + String.format("%.1f", NutritionMath.inferredCarbs(200, 30, 20)));
        // 4/4/9 energy checks`);
  t = t.replace("check('4/4/9 energy is computed'",
`check('missing carbs are detected', lines.carbsMissing === 'true,false', lines.carbsMissing);
check('carbs are inferred from the rest', lines.inferred === '57.5,0.0', lines.inferred);
check('4/4/9 energy is computed'`);
  fs.writeFileSync('tests/nutrition-math.test.mjs', t);
  console.log('jvm carb fallback assertions added');
}

let lib = fs.readFileSync('tests/training-library.test.mjs', 'utf8');
if (!lib.includes('carbCap falls back')) {
  lib = lib.replace("console.log('\\nFAIL total: ' + fail);",
`const rich = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js', 'utf8').split('/* Fragment of')[0];
const head = fs.readFileSync('app/src/fragments/00-head.fragment.js', 'utf8');
const carbFn = rich.slice(rich.indexOf('function carbCap'), rich.indexOf('/** Shows a retryable bar'));
check('carbCap falls back to the range max', carbFn.includes('number(range && range.max)'));
const runCarb = new Function('number', carbFn + '\\nreturn carbCap;')(v => v === null || v === undefined || v === '' ? null : Number(v));
check('carb limit renders without calorieTarget', runCarb({proteinMax: 155, fatMax: 70}, {max: 2314}) === 266, String(runCarb({proteinMax: 155, fatMax: 70}, {max: 2314})));
check('carb limit uses calorieTarget when present', runCarb({calorieTarget: 2000, proteinMax: 140, fatMax: 60}, {max: 2314}) === 205, String(runCarb({calorieTarget: 2000, proteinMax: 140, fatMax: 60}, {max: 2314})));
check('the app notes inferred carbs', fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8').includes('已按剩余热量反推'));
console.log('\\nFAIL total: ' + fail);`);
  fs.writeFileSync('tests/training-library.test.mjs', lib);
  console.log('js carb assertions added');
}
