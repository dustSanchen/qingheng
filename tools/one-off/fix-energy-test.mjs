import fs from 'node:fs';
let t = fs.readFileSync('tests/nutrition-math.test.mjs','utf8');
t = t.replace("System.out.println(\"fixed=\" + String.format(\"%.0f\", NutritionMath.reconciledKcal(800, 30, 50, 20)) + \",\" + String.format(\"%.0f\", NutritionMath.reconciledKcal(600, 30, 50, 20)));",
  "System.out.println(\"fixed=\" + String.format(\"%.0f\", NutritionMath.reconciledKcal(800, 30, 50, 20)) + \",\" + String.format(\"%.0f\", NutritionMath.reconciledKcal(530, 30, 50, 20)));");
t = t.replace("check('4/4/9 energy is computed', lines.macro === '560', lines.macro);", "check('4/4/9 energy is computed', lines.macro === '500', lines.macro);");
t = t.replace("check('a 240 kcal gap is caught', lines.loose === 'true', lines.loose);", "check('a 300 kcal gap is caught', lines.loose === 'true', lines.loose);");
t = t.replace("check('the macro-derived value replaces the bad one', lines.fixed === '560,600', lines.fixed);", "check('bad values are replaced, near misses kept', lines.fixed === '500,530', lines.fixed);");
t = t.replace("System.out.println(\"tight=\" + !NutritionMath.energyMismatch(560, 560)", "System.out.println(\"tight=\" + !NutritionMath.energyMismatch(500, 500)");
t = t.replace("+ \",\" + !NutritionMath.energyMismatch(600, 560));", "+ \",\" + !NutritionMath.energyMismatch(530, 500));");
t = t.replace("System.out.println(\"loose=\" + NutritionMath.energyMismatch(800, 560));", "System.out.println(\"loose=\" + NutritionMath.energyMismatch(800, 500));");
fs.writeFileSync('tests/nutrition-math.test.mjs', t);
console.log('expectations fixed');
