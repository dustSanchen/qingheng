import fs from 'node:fs';
// 1) 提示词：允许可选 fiber
const p = 'app/src/main/java/cn/qingheng/health/ai/Prompts.java';
let t = fs.readFileSync(p, 'utf8');
if (!t.includes('fiber')) {
  t = t.replace('"items 中每项必须有 name、grams、calories、protein、carbs、fat', '"items 中每项必须有 name、grams、calories、protein、carbs、fat（可选 fiber，单位克；能判断膳食纤维时填）');
  if (!t.includes('可选 fiber')) {
    // 找不到原句就追加一条系统约束
    t = t.replace('        return "你是谨慎的饮食营养助手', '        return "items 里能判断膳食纤维时加 fiber（克），没有就给 0。"\n                + "你是谨慎的饮食营养助手');
  }
  fs.writeFileSync(p, t);
  console.log('prompt mentions fiber:', fs.readFileSync(p,'utf8').includes('fiber'));
} else console.log('prompt already mentions fiber');

// 2) JVM 测试：纤维 2 kcal/g 与 4/4/9 的差异
let n = fs.readFileSync('tests/nutrition-math.test.mjs','utf8');
if (!n.includes('fiberAware')) {
  n = n.replace('System.out.println("fixed="',
`System.out.println("fiberAware=" + String.format("%.0f", NutritionMath.caloriesFromMacros(10, 60, 5, 20)) + "," + String.format("%.0f", NutritionMath.caloriesFromMacros(10, 60, 5)));
        System.out.println("fiberClamp=" + String.format("%.0f", NutritionMath.caloriesFromMacros(0, 10, 0, 30)));
        System.out.println("fixed="`);
  n = n.replace("check('bad values are replaced, near misses kept'",
`check('fiber counts 2 kcal/g', lines.fiberAware === '440,470', lines.fiberAware);
check('fiber is clamped to carbs', lines.fiberClamp === '20', lines.fiberClamp);
check('bad values are replaced, near misses kept'`);
  fs.writeFileSync('tests/nutrition-math.test.mjs', n);
  console.log('jvm fiber assertions added');
}
