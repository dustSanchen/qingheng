import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
if (!/--body-text\s*:/.test(css)) {
  css = css.replace(/--ink\s*:\s*#141413;/, '--ink:#141413;\n  --body-text:#3d3d3a;\n  --surface-soft:#efe9de;');
  fs.writeFileSync(f, css);
  console.log('tokens inserted');
} else console.log('already present');
console.log(css.split(/\r?\n/).slice(0, 8).join('\n'));
