import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.94';", "const APP_VERSION = '1.0.95';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.94',[int]$VersionCode=95)", "param([switch]$Clean,[string]$Version='1.0.95',[int]$VersionCode=96)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.94'", "const APP_VERSION = '1.0.95'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}

// 断言：拍照框必须走令牌；计算器要有单侧开关与回填
const test = 'tests/training-library.test.mjs';
let t = fs.readFileSync(test, 'utf8');
if (!t.includes('photo boxes follow the skin')) {
  t = t.replace("check('the term sheet exists'",
    "check('photo boxes follow the skin', cssText.includes('.capture-button:active{background:var(--ok-soft)') && cssText.includes('color:var(--accent)}'));\n" +
    "check('the weight calculator handles per-side input', appJs.includes('weight-per-side') && appJs.includes('weight-fill'));\n" +
    "check('the term sheet exists'");
  if (!t.includes('const cssText')) {
    t = t.replace("const appJs = fs.readFileSync('app/src/main/assets/app.js','utf8');",
      "const appJs = fs.readFileSync('app/src/main/assets/app.js','utf8');\nconst cssText = fs.readFileSync('app/src/main/assets/styles.css','utf8');");
  }
  fs.writeFileSync(test, t);
}
console.log('bumped to 1.0.95 + assertions');
