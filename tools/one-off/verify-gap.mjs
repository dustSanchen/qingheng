import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
console.log('has energy-detail flex:', css.includes('.energy-detail{display:flex'));
console.log('has button gap:', css.includes('.energy-detail .button + .button'));
