import fs from 'node:fs';
const css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css','utf8');
const decls = [...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/g)];
const bad = decls.filter(m => {
  const name = m[1], val = m[2];
  const refs = [...val.matchAll(/var\((--[a-z0-9-]+)/g)].map(r => r[1]);
  return refs.includes(name);
});
console.log('self-referential:', bad.length);
console.log(bad.slice(0,10).map(b => b[0]).join('\n'));
const nullish = decls.filter(m => /^\s*$/.test(m[2]) || /var\(--[a-z-]+\)\s*$/.test(m[2]) && false);
