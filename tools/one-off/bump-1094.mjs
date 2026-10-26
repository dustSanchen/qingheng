import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.93';", "const APP_VERSION = '1.0.94';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.93',[int]$VersionCode=94)", "param([switch]$Clean,[string]$Version='1.0.94',[int]$VersionCode=95)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.93'", "const APP_VERSION = '1.0.94'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}

// 断言：关闭绑定必须存在
const test = 'tests/training-library.test.mjs';
let t = fs.readFileSync(test, 'utf8');
if (!t.includes('the term sheet can be closed')) {
  t = t.replace("check('the term sheet exists'",
    "check('the term sheet can be closed', appJs.includes('installTermSheet') && appJs.includes('term-close'));\ncheck('the term sheet exists'");
  fs.writeFileSync(test, t);
}
console.log('bumped to 1.0.94 and added a closing assertion');
