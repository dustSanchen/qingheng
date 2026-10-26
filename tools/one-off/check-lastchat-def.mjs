import fs from 'node:fs';
for (const f of ['app/src/main/assets/app.js','app/src/fragments/70-rest.fragment.js']) {
  const t = fs.readFileSync(f,'utf8');
  console.log(f, '| renderLastChat:', (t.match(/renderLastChat/g)||[]).length, '| renderDayStream:', (t.match(/renderDayStream/g)||[]).length);
}
const t = fs.readFileSync('app/src/fragments/70-rest.fragment.js','utf8');
const i = t.indexOf('async function loadStorageStatus');
console.log('...context...');
console.log(t.slice(Math.max(0,i-260), i+40));
