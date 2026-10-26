import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
let n = 0;
const set = (name, value) => {
  const re = new RegExp('(' + name + '\\s*:\\s*)([^;]+);', 'g');
  if (!re.test(css)) { console.log('skip', name); return; }
  css = css.replace(new RegExp('(' + name + '\\s*:\\s*)([^;]+);'), '$1' + value + ';');
  n++;
};
// paper：降低饱和、提高明度
set('--diet-in', '#9cbaa2');
set('--diet-low', '#dfcaa5');
set('--diet-over', '#d39273');
set('--diet-track', '#f1f3ee');
set('--diet-band', '#edf2e7');
set('--diet-band-line', '#dbe5d2');
// ledger 同向调整（第一次出现的是 ledger 块里的值）
css = css.replace('--diet-in:#7fa88c;', '--diet-in:#95b39c;');
css = css.replace('--diet-low:#d3ad70;', '--diet-low:#dcc9a8;');
css = css.replace('--diet-over:#c98d72;', '--diet-over:#cf9578;');
n += 3;
// 条更细 + 不足态略透明，减少色块体量
css = css.replace('.diet-bar{position:relative;flex:1 1 auto;height:8px;', '.diet-bar{position:relative;flex:1 1 auto;height:6px;');
css = css.replace('background:var(--diet-low)', 'background:var(--diet-low);opacity:.9');
fs.writeFileSync(f, css);
console.log('changed:', n);
for (const k of ['--diet-in','--diet-low','--diet-over','--diet-track']) {
  const all = [...css.matchAll(new RegExp(k + ':[^;]+;', 'g'))].map(m => m[0]);
  console.log(k, all.join(' | '));
}
