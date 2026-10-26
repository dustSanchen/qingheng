import fs from 'node:fs';
const file = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(file, 'utf8');
const from = '.meal-item b{color:var(--ink);font-variant-numeric:tabular-nums}';
const to = '.meal-item b{color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap;flex:0 0 auto}\n.meal-item span{flex:1 1 auto;min-width:0;word-break:break-word}';
if (!css.includes(from)) throw new Error('anchor missing');
fs.writeFileSync(file, css.replace(from, to));
console.log('meal item layout fixed');
