import fs from 'node:fs';
const file = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(file, 'utf8');
const from = '.diet-bar i{position:relative;z-index:1;opacity:.92}';
const to = '.diet-band{z-index:0}\n.diet-bar i{z-index:1;opacity:.92}';
if (!css.includes(from)) throw new Error('anchor missing');
css = css.replace(from, to);
fs.writeFileSync(file, css);
console.log('fill keeps its absolute positioning');
