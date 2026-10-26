import fs from 'node:fs';
// 1) JVM: 能量换算与偏差判定
let t = fs.readFileSync('tests/nutrition-math.test.mjs','utf8');
const extra = [
  "const energy = execFileSync(java, ['-cp', work, 'Harness'], {encoding: 'utf8'});",
];
const harnessAdd = `
const energySource = ${JSON.stringify('caloriesFromMacros')};
`;
// 直接在 harness 里加一段输出
let harnessT = t;
harnessT = harnessT.replace(
  'System.out.println("note=" + NutritionMath.mismatchNote(10).contains("10 g"));',
  `System.out.println("note=" + NutritionMath.mismatchNote(10).contains("10 g"));
        // 4/4/9 energy checks
        System.out.println("macro=" + String.format("%.0f", NutritionMath.caloriesFromMacros(30, 50, 20)));
        System.out.println("tight=" + !NutritionMath.energyMismatch(560, 560) + "," + !NutritionMath.energyMismatch(600, 560));
        System.out.println("loose=" + NutritionMath.energyMismatch(800, 560));
        System.out.println("fixed=" + String.format("%.0f", NutritionMath.reconciledKcal(800, 30, 50, 20)) + "," + String.format("%.0f", NutritionMath.reconciledKcal(600, 30, 50, 20)));`);
harnessT = harnessT.replace(
  "check('the note names the oil amount', lines.note === 'true', lines.note);",
  `check('the note names the oil amount', lines.note === 'true', lines.note);
check('4/4/9 energy is computed', lines.macro === '560', lines.macro);
check('small rounding differences pass', lines.tight === 'true,true', lines.tight);
check('a 240 kcal gap is caught', lines.loose === 'true', lines.loose);
check('the macro-derived value replaces the bad one', lines.fixed === '560,600', lines.fixed);`);
fs.writeFileSync('tests/nutrition-math.test.mjs', harnessT);
console.log('jvm assertions added');
