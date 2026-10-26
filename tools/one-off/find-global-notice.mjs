import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
for (const m of css.matchAll(/([^{}]*global-notice[^{}]*)\{([^}]*)\}/g)) console.log(m[1].trim(), '=>', m[2].replace(/\s+/g,' '));
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('global-notice');
console.log('--- markup ---');
console.log(html.slice(Math.max(0,i-200), i+400).replace(/\s+/g,' ').slice(0,520));
