import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/50-onboarding.fragment.js','utf8');
const i = t.indexOf('stats-trend');
console.log(i >= 0 ? JSON.stringify(t.slice(Math.max(0,i-120), i+260)) : 'not in 50');
const files = fs.readdirSync('app/src/fragments');
for (const f of files) {
  const s = fs.readFileSync('app/src/fragments/'+f, 'utf8');
  const j = s.indexOf('stats-trend');
  if (j >= 0 && f !== '50-onboarding.fragment.js') { console.log('in ' + f + ':'); console.log(JSON.stringify(s.slice(Math.max(0,j-140), j+240))); }
}
