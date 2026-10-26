import fs from 'node:fs';

const f = 'app/src/fragments/70-rest.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const from = '{question: prompt, date: activeDate, webSearch: false, tier: "fast"}';
const to = '{question: prompt, date: activeDate, webSearch: false, tier: "fast", allowExternal: true}';
if (t.includes(from)) {
  t = t.replace(from, to);
  fs.writeFileSync(f, t);
  console.log('allowExternal added to the AI plan request');
} else {
  console.log('anchor missing');
}
