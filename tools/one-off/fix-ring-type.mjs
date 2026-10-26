import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
css = css.replace('.energy-ring span{font-size:10px;margin-top:2px;letter-spacing:0}', '.energy-ring span{font-size:var(--text-xs);margin-top:2px;letter-spacing:0}');
css = css.replace('.energy-ring strong{font-size:22px;line-height:1.05}', '.energy-ring strong{font-size:21px;line-height:1.05}');
fs.writeFileSync(f, css);
console.log('ring type fixed to token sizes');
