import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
for (const k of ['.tab-bar','.app-shell','.view{','main{','#main']) {
  const i = css.indexOf(k);
  if (i >= 0) console.log(k, '->', css.slice(i, i + 200).replace(/\s+/g,' ').slice(0, 200));
}
