import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
for (const m of css.matchAll(/([^{}]*(?:photo|capture|picker|shot)[^{}]*)\{([^}]*)\}/g)) {
  const b = m[2].replace(/\s+/g,' ');
  if (/background|border|color/.test(b)) console.log(m[1].trim().slice(0,44), '=>', b.slice(0,110));
}
