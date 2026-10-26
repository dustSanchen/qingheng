import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
for (const m of css.matchAll(/([^{}]*(?:dashboard-grid|energy|view|card)[^{}]*)\{([^}]*)\}/g)) {
  const body = m[2].replace(/\s+/g,' ');
  if (/overflow|grid-template|width|margin|transform|translate|position/.test(body)) {
    console.log(m[1].trim().slice(0,46), '=>', body.slice(0,140));
  }
}
