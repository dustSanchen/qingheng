import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const i = css.indexOf('.view{animation');
console.log(JSON.stringify(css.slice(i, i+120)));
