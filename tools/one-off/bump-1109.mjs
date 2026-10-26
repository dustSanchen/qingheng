import fs from 'node:fs';

// 让偏好在进入页面时就装好
const f = 'app/src/fragments/70-rest.fragment.js';
let t = fs.readFileSync(f, 'utf8');
if (!t.includes('installPlanPrefs()')) {
  const anchor = '    if (typeof installWeightCalc === "function") installWeightCalc();';
  if (!t.includes(anchor)) throw new Error('boot anchor missing');
  t = t.replace(anchor, anchor + '\n    if (typeof installPlanPrefs === "function") installPlanPrefs();');
  fs.writeFileSync(f, t);
  console.log('installPlanPrefs wired at boot');
}

const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.1.08';", "const APP_VERSION = '1.1.09';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.1.08',[int]$VersionCode=109)", "param([switch]$Clean,[string]$Version='1.1.09',[int]$VersionCode=110)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.1.08'", "const APP_VERSION = '1.1.09'"],
];
for (const [file, a, b] of plan) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.split(a).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, s.replace(a, b));
}
console.log('bumped to 1.1.09');
