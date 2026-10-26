import fs from 'node:fs';

const f = 'app/src/fragments/60-training-copy.fragment.js';
let t = fs.readFileSync(f, 'utf8');
let n = 0;
const add = (anchor, replacement) => {
  const count = t.split(anchor).length - 1;
  if (count !== 1) { console.log('SKIP(' + count + ')', anchor.slice(0, 40)); return; }
  t = t.replace(anchor, replacement); n++; console.log('ok  ', anchor.slice(0, 40));
};

// 热量：低于下限 = low（琥珀），高于上限 = high（红）
add("state: sum.calories === 0 ? 'idle' : undefined});",
    "state: sum.calories === 0 ? 'idle' : (sum.calories < range.min ? 'low' : sum.calories > range.max ? 'high' : undefined)});");
// 蛋白：低于下限 = low
add("score: clamp01(sum.protein / src.proteinMin), state: sum.calories === 0 ? 'idle' : undefined});",
    "score: clamp01(sum.protein / src.proteinMin), state: sum.calories === 0 ? 'idle' : (sum.protein < src.proteinMin ? 'low' : undefined)});");
// 脂肪：低于下限或高于上限都算 attention，但只有超上限用 high
add("clamp01(1 - distance / Math.max(10, src.fatMax)), state: sum.calories === 0 ? 'idle' : undefined});",
    "clamp01(1 - distance / Math.max(10, src.fatMax)), state: sum.calories === 0 ? 'idle' : (sum.fat > src.fatMax ? 'high' : sum.fat < src.fatMin ? 'low' : undefined)});");

if (n) fs.writeFileSync(f, t);
console.log('applied:', n);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.check-item.low')) {
  css += '\n/* Below-target is amber, over-limit is red, unrecorded is neutral. */\n' +
    '.check-item.low{border-color:var(--warn-line);background:var(--warn-soft)}\n' +
    '.check-item.low .check-dot{background:var(--warn)}\n' +
    '.check-item.high{border-color:var(--danger-line);background:var(--danger-soft)}\n' +
    '.check-item.high .check-dot{background:var(--danger)}\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  low/high styles');
}
