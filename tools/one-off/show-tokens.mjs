import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const root = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')));
console.log(root.split(';').filter(l => /text|space|radius|card/.test(l)).join(';\n'));
