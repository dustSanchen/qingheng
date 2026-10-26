import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const i = css.indexOf('.bottom-nav{');
console.log('nav rule:', css.slice(i, i+320).replace(/\s+/g,' '));
