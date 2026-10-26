import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const re = /([^{}]*(?:diet)[^{}]*)\{([^}]*)\}/g;
let m, n=0;
while ((m = re.exec(css))) { n++; console.log(m[1].trim().slice(0,48), '=>', m[2].replace(/\s+/g,' ').slice(0,130)); }
console.log('rules:', n);
