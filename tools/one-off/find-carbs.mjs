import fs from 'node:fs';
const files = ['app/src/fragments/40-targets.fragment.js','app/src/fragments/00-head.fragment.js','app/src/fragments/50-onboarding.fragment.js'];
for (const f of files) {
  const t = fs.readFileSync(f,'utf8');
  const lines = t.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/carbs/i.test(line)) console.log(f.split('/').pop() + ':' + (i+1) + '  ' + line.trim().slice(0, 150));
  });
}
