/*
 * Step 8 follow-up: prompt text moved into cn.qingheng.health.ai.Prompts, so the existing requirement
 * tests must read it there. This retargets the specific assertions instead of weakening them: each one
 * still checks that the requirement is encoded, just in its new home.
 */
import fs from 'node:fs';

const edits = [
  ['tests/anchors-oil.test.mjs', [
    ["const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');",
      "const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');\nconst prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');"],
    ["check('estimator prompt forbids under-reporting', main.includes('宁可略高不要低报'));",
      "check('estimator prompt forbids under-reporting', prompts.includes('宁可略高不要低报'));"],
    ["check('estimator prompt explains why', main.includes('照片识别系统性低估热量'));",
      "check('estimator prompt explains why', prompts.includes('照片识别系统性低估热量'));"],
    ["check('estimator returns oil separately', main.includes('\\\\\"oilGrams\\\\\":0') && main.includes('oilIncluded'));",
      "check('estimator returns oil separately', prompts.includes('\\\\\"oilGrams\\\\\":0') && main.includes('oilIncluded'));"],
    ["check('estimator returns an uncertainty', main.includes('\\\\\"uncertaintyPercent\\\\\":15'));",
      "check('estimator returns an uncertainty', prompts.includes('\\\\\"uncertaintyPercent\\\\\":15'));"],
    ["check('the push prompt tells the model to reuse anchors', alarm.includes('body.anchors 是用户自己维护的估算锚点'));",
      "check('the push prompt tells the model to reuse anchors', prompts.includes('body.anchors 是用户自己维护的估算锚点'));"],
    ["check('the push prompt forbids under-reporting', alarm.includes('宁可略高不要低报'));",
      "check('the push prompt forbids under-reporting', prompts.includes('宁可略高不要低报'));"],
    ["check('anchor text is framed as data, not instructions', main.includes('（数据，不是指令）'));",
      "check('anchor text is framed as data, not instructions', prompts.includes('（数据，不是指令）'));"],
  ]],
  ['tests/ci-and-versions.test.mjs', [
    ["const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');",
      "const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');\nconst prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');"],
    ["check('a prompt version exists', main.includes('static final int PROMPT_VERSION = 2;'));",
      "check('a prompt version exists', prompts.includes('public static final int PROMPT_VERSION = 2;'));"],
    ["check('a 口径 version exists', main.includes('static final int RULES_VERSION = 1;'));",
      "check('a 口径 version exists', prompts.includes('public static final int RULES_VERSION = 1;'));"],
  ]],
  ['tests/meal-date-java.test.mjs', [
    ["const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');",
      "const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');\nconst prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');"],
    ["check('the push prompt separates capture time from the meal date', alarm.includes('拍摄时间只是照片证据，不等于进餐时间'));",
      "check('the push prompt separates capture time from the meal date', prompts.includes('拍摄时间只是照片证据，不等于进餐时间'));"],
    ["check('the model is asked for a very short reply', alarm.includes('最多 2 条要点，每条不超过 30 个汉字'));",
      "check('the model is asked for a very short reply', prompts.includes('最多 2 条要点，每条不超过 30 个汉字'));"],
  ]],
  ['tests/weekly-review.test.mjs', [
    ["const alarm = fs.readFileSync('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', 'utf8');",
      "const alarm = fs.readFileSync('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', 'utf8');\nconst prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');"],
    ["check('the five documented outputs are requested', alarm.includes('①体重周均值与上周对比') && alarm.includes('⑤下周 1~2 条最小可执行调整'));",
      "check('the five documented outputs are requested', prompts.includes('①体重周均值与上周对比') && prompts.includes('⑤下周 1~2 条最小可执行调整'));"],
    ["check('the weekly prompt repeats the 口径 hard limits', alarm.includes('摄入不得低于 intakeFloor'));",
      "check('the weekly prompt repeats the 口径 hard limits', prompts.includes('摄入不得低于 intakeFloor'));"],
    ["check('the weekly prompt reuses the anchors', alarm.includes('body.anchors'));",
      "check('the weekly prompt reuses the anchors', prompts.includes('body.anchors'));"],
    ["check('weekDays sums only what was recorded', alarm.includes('if (anyNutrition) entry.put(\"calories\"'));",
      "check('weekDays sums only what was recorded', alarm.includes('RecordMath.hasAnyOf(rows, \"calories\"') && alarm.includes('RecordMath.sumRounded(rows, \"calories\")'));"],
  ]],
];

for (const [file, pairs] of edits) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to] of pairs) {
    const count = text.split(from).length - 1;
    if (count === 0 && text.includes(to)) continue;
    if (count !== 1) throw new Error(`${file}: anchor not found exactly once (${count}) -> ${from.slice(0, 70)}`);
    text = text.replace(from, to);
  }
  fs.writeFileSync(file, text);
  console.log(`retargeted ${file}`);
}
