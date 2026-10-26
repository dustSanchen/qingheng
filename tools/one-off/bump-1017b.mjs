import fs from 'node:fs';
const plan = [
  ['app/src/fragments/70-rest.fragment.js', "const APP_VERSION = '1.0.16';", "const APP_VERSION = '1.0.17';"],
  ['build.ps1', "param([switch]$Clean,[string]$Version='1.0.16',[int]$VersionCode=17)", "param([switch]$Clean,[string]$Version='1.0.17',[int]$VersionCode=18)"],
  ['tests/meal-date-java.test.mjs', "const APP_VERSION = '1.0.16'", "const APP_VERSION = '1.0.17'"],
];
for (const [file, from, to] of plan) {
  const text = fs.readFileSync(file, 'utf8');
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`${file}: anchor ${n}x`);
  fs.writeFileSync(file, text.replace(from, to));
  console.log('bumped ' + file);
}
