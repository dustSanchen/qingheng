import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.18';", "const APP_VERSION = '1.0.19';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.18',[int]$VersionCode=19)", "param([switch]$Clean,[string]$Version='1.0.19',[int]$VersionCode=20)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.18'", "const APP_VERSION = '1.0.19'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`${file}: anchor ${n}x`);
  fs.writeFileSync(file, text.replace(from, to));
  console.log('bumped ' + file);
}
