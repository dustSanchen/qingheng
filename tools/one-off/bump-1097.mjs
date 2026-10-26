import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.96';", "const APP_VERSION = '1.0.97';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.96',[int]$VersionCode=97)", "param([switch]$Clean,[string]$Version='1.0.97',[int]$VersionCode=98)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.96'", "const APP_VERSION = '1.0.97'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}

// 断言：拍照原图保留开关存在
const test = 'tests/camera-lifecycle.test.mjs';
let t = fs.readFileSync(test, 'utf8');
if (!t.includes('KEEP_CAPTURE_ORIGINAL')) {
  t = t.replace("const java = fs.readFileSync(new URL('java/cn/qingheng/health/MainActivity.java', root), 'utf8');",
`const java = fs.readFileSync(new URL('java/cn/qingheng/health/MainActivity.java', root), 'utf8');
assert(java.includes('KEEP_CAPTURE_ORIGINAL'), 'camera captures keep the original in the gallery');
assert(/if \\(!KEEP_CAPTURE_ORIGINAL\\) try/.test(java), 'the delete path is gated by the keep switch');`);
  fs.writeFileSync(test, t);
}
console.log('bumped to 1.0.97 + camera assertions');
