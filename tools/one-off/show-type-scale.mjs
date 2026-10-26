import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
for (const sel of ['.fine-print','.muted','.card{','.card-heading','.form-grid','body{','.app-shell','.view','.list-stack','.record-grid']) {
  const i = css.indexOf(sel);
  console.log(sel.padEnd(16), i >= 0 ? css.slice(i, i + 200).split('}')[0] + '}' : 'not found');
}
