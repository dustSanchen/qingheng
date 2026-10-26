import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
for (const m of css.matchAll(/([^{}]*(?:energy-ring|energy-body|energy-card|energy-detail)[^{}]*)\{([^}]*)\}/g)) {
  console.log(m[1].trim().slice(0,40), '=>', m[2].replace(/\s+/g,' ').slice(0,150));
}
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('energy-ring');
console.log('--- markup ---');
console.log(html.slice(i-260, i+420).replace(/\s+/g,' ').slice(0,620));
