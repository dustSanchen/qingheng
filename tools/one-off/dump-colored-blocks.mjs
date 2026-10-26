import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
for (const m of css.matchAll(/([^{}]*(?:trend-warnings|diet-band|notice|plan-why|diet-audit|plan-cue)[^{}]*)\{([^}]*)\}/g)) {
  const body = m[2].replace(/\s+/g,' ');
  if (/background|border/.test(body)) console.log(m[1].trim().slice(0,44), '=>', body.slice(0,110));
}
