import fs from 'node:fs';
const f = 'app/src/fragments/40-targets.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const from = 'const years = number(state && state.profile ? state.profile.trainingYears : null);';
const to = 'const years = (typeof state !== "undefined" && state && state.profile) ? number(state.profile.trainingYears) : null;';
if (!t.includes(from)) { console.log('MISS years line'); process.exit(1); }
fs.writeFileSync(f, t.replace(from, to));
console.log('years guard fixed');
