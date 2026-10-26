import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
let n = 0;
// 1) details summary 脱离米黄分组，改成中性底 + 发丝线
const grp = '.diet-audit,.plan-cue,details summary{background:var(--surface-soft)}';
if (css.includes(grp)) {
  css = css.replace(grp, '.diet-audit,.plan-cue{background:var(--surface-soft)}');
  n++;
  console.log('ok  details summary 移出米黄分组');
}
if (!css.includes('/* disclosure rows stay neutral */')) {
  css += `
/* disclosure rows stay neutral — no tan fill, just a hairline and a disclosure mark. */
details{border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface);padding:10px 12px}
details summary{padding:2px 0;color:var(--body-text)}
details[open]{background:var(--surface)}
`;
  n++;
  console.log('ok  disclosure 中性样式');
}
// 2) surface-soft 再中性化，去掉暖黄
css = css.replace(/--surface-soft:#f4f1e8;/, '--surface-soft:#f3f2ee;');
css = css.replace(/--surface-soft:\s*#f4f1e8;/, '--surface-soft:#f3f2ee;');
n++;
fs.writeFileSync(f, css);
console.log('changed:', n, '| surface-soft:', (css.match(/--surface-soft:\s*#[0-9a-f]{6}/)||[])[0]);
