import fs from 'node:fs';
let t = fs.readFileSync('tools/one-off/check-three.mjs','utf8');
t = t.replace("'oil field removed from daily three': !html.includes('name=\"oilSpoons\"'),",
              "'oil field left only in the manual form': (html.match(/name=\"oilSpoons\"/g) || []).length === 1,");
fs.writeFileSync('tools/one-off/check-three.mjs', t);
console.log('check scoped');
