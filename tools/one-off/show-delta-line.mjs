import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/50-onboarding.fragment.js','utf8');
const i = t.indexOf('范围内首末变化');
console.log(JSON.stringify(t.slice(Math.max(0, i - 420), i + 420)));
