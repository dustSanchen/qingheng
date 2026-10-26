import fs from 'node:fs';

// 断言：切到不健身时，训练选项卡必须一起隐藏
const test = 'tests/training-library.test.mjs';
let t = fs.readFileSync(test, 'utf8');
if (!t.includes('training tabs disappear')) {
  t = t.replace("check('the term sheet exists'",
    "check('training tabs disappear in the no-training mode', appJs.includes('[data-records-panel=\\\"training\\\"]') && appJs.includes('[data-trends-panel=\\\"training\\\"]'));\ncheck('the term sheet exists'");
  fs.writeFileSync(test, t);
  console.log('assertion added');
} else console.log('assertion exists');

const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.19';", "const APP_VERSION = '1.1.20';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.19',[int]$VersionCode=120)", "param([switch]$Clean,[string]$Version='1.1.20',[int]$VersionCode=121)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.19'", "const APP_VERSION = '1.1.20'"],
];
for (const [file, a, b] of plan) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, s.replace(a, b));
}
console.log('bumped to 1.1.20');
