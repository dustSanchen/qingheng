import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const re = /([^{}]*\.notice[^{}]*)\{([^}]*)\}/g;
let m, n = 0;
while ((m = re.exec(css))) { n++; console.log('#' + n, m[1].trim().slice(0,40), '=>', m[2].replace(/\s+/g,' ').slice(0,120)); }
console.log('total .notice rules:', n);
console.log('still has #f1ebdb:', css.includes('#f1ebdb'));
