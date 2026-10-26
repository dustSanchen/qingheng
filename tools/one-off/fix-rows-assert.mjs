import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const i = css.indexOf('.food-result{animation');
console.log(JSON.stringify(css.slice(i, i+140)));
const p = 'tests/icons-motion.test.mjs';
let t = fs.readFileSync(p, 'utf8');
const from = "css.includes('.food-result{animation:rowIn .22s ease-out both')";
const to = "css.includes('.food-result{animation:rowIn var(--dur-base) ease-out both')";
if (t.includes(from)) { t = t.replace(from, to); fs.writeFileSync(p, t); console.log('rows assertion updated'); }
else console.log('rows anchor missing');
