import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const z = [...css.matchAll(/z-index:\s*(\d+)/g)].map(m=>m[1]);
console.log('z-index values:', [...new Set(z)].join(' '));
for (const k of ['.tab-bar{','.sheet{','.app-dialog{','.term-sheet{','.empty-state{','.empty-icon']) {
  const i = css.indexOf(k);
  console.log(k, i>=0 ? css.slice(i, i+170).replace(/\s+/g,' ') : 'MISSING');
}
const ls = [...css.matchAll(/letter-spacing:\s*([^;}]+)/g)].map(m=>m[1].trim());
console.log('letter-spacing literals:', [...new Set(ls)].join(' | '), 'count', ls.length);
