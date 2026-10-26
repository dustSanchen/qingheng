import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const i = css.indexOf('.notice');
console.log(css.slice(i, i + 420));
