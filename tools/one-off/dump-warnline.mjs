import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
for (const m of css.matchAll(/([^{}]*warn-line[^{}]*)\{([^}]*)\}/g)) console.log(m[1].trim(), '=>', m[2].replace(/\s+/g,' '));
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('trend-warnings');
console.log('markup:', html.slice(Math.max(0,i-160), i+120).replace(/\s+/g,' ').slice(0,300));
