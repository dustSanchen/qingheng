import fs from 'node:fs';

// 断言：不健身（"none"）必须能保存
const test = 'tests/meal-date-java.test.mjs';
let t = fs.readFileSync(test, 'utf8');
if (!t.includes('不健身')) {
  t += `

// 不健身是一个答案，不是一个非法值：training = "none" 必须能保存。
{
  const java = fs.readFileSync(new URL('java/cn/qingheng/health/MainActivity.java', root), 'utf8');
  assert(java.includes('"none".equals(String.valueOf(trainingRaw))'), 'training accepts the literal none');
}
`;
  fs.writeFileSync(test, t);
  console.log('assertion added');
} else console.log('assertion exists');

const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.22';", "const APP_VERSION = '1.1.23';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.22',[int]$VersionCode=123)", "param([switch]$Clean,[string]$Version='1.1.23',[int]$VersionCode=124)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.22'", "const APP_VERSION = '1.1.23'"],
];
for (const [file, a, b] of plan) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, s.replace(a, b));
}
console.log('bumped to 1.1.23');
