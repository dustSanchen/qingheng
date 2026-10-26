import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
// 找橙色系色值与所在规则
const orangeish = ['#a8622c','#c9776f','#a74638','#e8a55a','#f0b27a','#fdf3e6','#fbeee2','#f7e3cc','#e0a15c','#d98b4a'];
for (const c of orangeish) {
  let idx = -1;
  while ((idx = css.indexOf(c, idx + 1)) !== -1) {
    const start = css.lastIndexOf('}', idx) + 1;
    const sel = css.slice(start, css.indexOf('{', start)).trim().slice(0, 80);
    console.log(c.padEnd(9), '<-', sel);
  }
}
console.log('--- notice / warn rules ---');
for (const m of css.matchAll(/([^{}]*\.(?:notice|warn|alert|check-item|trend-warnings)[^{}]*)\{([^}]*)\}/g)) {
  console.log(m[1].trim().slice(0,70), '=>', m[2].replace(/\s+/g,' ').slice(0,120));
}
