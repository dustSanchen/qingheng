import fs from 'node:fs';
const p = 'tests/icons-motion.test.mjs';
let t = fs.readFileSync(p, 'utf8');
const from = "css.includes('.view{animation:viewIn .26s cubic-bezier(.22,.8,.3,1)')";
const to = "css.includes('.view{animation:viewIn var(--dur-slow) cubic-bezier(.22,.8,.3,1)')";
if (t.includes(from)) { t = t.replace(from, to); fs.writeFileSync(p, t); console.log('assertion updated to token form'); }
else console.log('anchor missing');
