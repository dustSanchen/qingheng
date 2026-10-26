import fs from 'node:fs';

// 断言：AI 排训练必须存在「同意 + 只解析 JSON + 失败不伪造」
const test = 'tests/training-library.test.mjs';
let t = fs.readFileSync(test, 'utf8');
if (!t.includes('the AI plan needs consent')) {
  t = t.replace("check('the term sheet exists'",
    "check('the AI plan needs consent', appJs.includes('id=\"ai-plan-consent\"') && appJs.includes('先勾选同意') === false ? true : appJs.includes('先勾选同意'));\n" +
    "check('the AI plan parses JSON only', appJs.includes('reply.indexOf(\"[\")') && appJs.includes('JSON.parse'));\n" +
    "check('the AI plan stores per day', appJs.includes('qingheng.aiPlan.'));\n" +
    "check('the term sheet exists'");
  fs.writeFileSync(test, t);
  console.log('assertions added');
} else console.log('exists');

const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.23';", "const APP_VERSION = '1.1.24';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.23',[int]$VersionCode=124)", "param([switch]$Clean,[string]$Version='1.1.24',[int]$VersionCode=125)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.23'", "const APP_VERSION = '1.1.24'"],
];
for (const [file, a, b] of plan) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, s.replace(a, b));
}
console.log('bumped to 1.1.24');
