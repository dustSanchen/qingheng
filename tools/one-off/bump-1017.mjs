import fs from 'node:fs';
// Version bump: this round changes user-visible answer behaviour, so it gets its own version.
let app = fs.readFileSync('app/src/fragments/00-head.fragment.js','utf8');
const from = "const APP_VERSION = '1.0.16';", to = "const APP_VERSION = '1.0.17';";
if(app.split(from).length-1 !== 1) throw new Error('APP_VERSION anchor missing');
fs.writeFileSync('app/src/fragments/00-head.fragment.js', app.replace(from, to));
let build = fs.readFileSync('build.ps1','utf8');
const bFrom = "param([switch]$Clean,[string]$Version='1.0.16',[int]$VersionCode=17)", bTo = "param([switch]$Clean,[string]$Version='1.0.17',[int]$VersionCode=18)";
if(build.split(bFrom).length-1 !== 1) throw new Error('build.ps1 version anchor missing');
fs.writeFileSync('build.ps1', build.replace(bFrom, bTo));
let test = fs.readFileSync('tests/meal-date-java.test.mjs','utf8');
const tFrom = "const APP_VERSION = '1.0.16'", tTo = "const APP_VERSION = '1.0.17'";
if(test.split(tFrom).length-1 !== 1) throw new Error('test version anchor missing');
fs.writeFileSync('tests/meal-date-java.test.mjs', test.replace(tFrom, tTo));
console.log('bumped to 1.0.17 / versionCode 18');
