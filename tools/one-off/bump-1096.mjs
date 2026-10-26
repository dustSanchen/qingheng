import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.95';", "const APP_VERSION = '1.0.96';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.95',[int]$VersionCode=96)", "param([switch]$Clean,[string]$Version='1.0.96',[int]$VersionCode=97)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.95'", "const APP_VERSION = '1.0.96'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}

const test = 'tests/training-library.test.mjs';
let t = fs.readFileSync(test, 'utf8');
if (!t.includes('the credits block lists the channels')) {
  t = t.replace("check('the term sheet exists'",
    "check('the credits block lists the channels', idxHtml.includes('id=\"credits\"') && idxHtml.includes('space.bilibili.com/2100737396') && idxHtml.includes('space.bilibili.com/521903482') && idxHtml.includes('space.bilibili.com/2078781964'));\ncheck('the term sheet exists'");
  fs.writeFileSync(test, t);
}
console.log('bumped to 1.0.96 + credits assertion');
