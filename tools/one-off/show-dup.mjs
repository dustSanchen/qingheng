import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/50-onboarding.fragment.js','utf8');
const hits = [...t.matchAll(/const EXERCISE_PRESETS/g)].map(m => m.index);
console.log('occurrences:', hits.length, hits);
for (const h of hits) {
  const start = t.lastIndexOf('\n', h - 200);
  console.log('---\n' + t.slice(h - 120, h + 60).replace(/\r/g,''));
}
console.log('renderTrainingLog count:', (t.match(/function renderTrainingLog\(\) \{/g)||[]).length);
