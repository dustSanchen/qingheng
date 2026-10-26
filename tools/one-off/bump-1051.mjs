import fs from 'node:fs';
let t = fs.readFileSync('tests/training-library.test.mjs','utf8');
t = t.replace("check('rules are plentiful in v2', lib.rules.length >= 24, String(lib.rules.length));",
"check('rules are plentiful in v2', lib.rules.length >= 24, String(lib.rules.length));\ncheck('verified recovery rules exist', ['stretch-after-training','foam-roll-legs','desk-neck-release'].every(id => ids.has(id)));\ncheck('season episodes are recorded', Array.isArray(lib.sources[0].episodes) && lib.sources[0].episodes.length === 7);\ncheck('ALEX episodes are recorded', Array.isArray(lib.sources[2].episodes) && lib.sources[2].episodes.length >= 3);\ncheck('the ALEX correction is written down', lib.sources[2].note.includes('第三方'));");
fs.writeFileSync('tests/training-library.test.mjs', t);
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.50';", "const APP_VERSION = '1.0.51';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.50',[int]$VersionCode=51)", "param([switch]$Clean,[string]$Version='1.0.51',[int]$VersionCode=52)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.50'", "const APP_VERSION = '1.0.51'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.split(from).length - 1 !== 1) throw new Error(file + ': anchor missing');
  fs.writeFileSync(file, text.replace(from, to));
}
console.log('assertions + bump to 1.0.51');
