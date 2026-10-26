import fs from 'node:fs';

const f = 'app/src/fragments/60-training-copy.fragment.js';
let t = fs.readFileSync(f, 'utf8');
let n = 0;

const add = (anchor, replacement) => {
  const count = t.split(anchor).length - 1;
  if (count !== 1) { console.log('SKIP(' + count + ')', anchor.slice(0, 46)); return; }
  t = t.replace(anchor, replacement);
  n++;
  console.log('ok  ', anchor.slice(0, 46));
};

add("clamp01(1 - distance / width)});",
    "clamp01(1 - distance / width), state: sum.calories === 0 ? 'idle' : undefined});");
add("score: clamp01(sum.protein / src.proteinMin)});",
    "score: clamp01(sum.protein / src.proteinMin), state: sum.calories === 0 ? 'idle' : undefined});");
add("clamp01(1 - distance / Math.max(10, src.fatMax))});",
    "clamp01(1 - distance / Math.max(10, src.fatMax)), state: sum.calories === 0 ? 'idle' : undefined});");
add("score: trained || habit.training === false || habit.training === 'false' ? 1 : 0.4});",
    "score: trained || habit.training === false || habit.training === 'false' ? 1 : 0.4, state: trained || habit.training === false || habit.training === 'false' ? undefined : 'idle'});");
add("score: Number.isFinite(sleep) && sleep > 0 ? clamp01(sleep / 7) : 0.4});",
    "score: Number.isFinite(sleep) && sleep > 0 ? clamp01(sleep / 7) : 0.4, state: Number.isFinite(sleep) && sleep > 0 ? undefined : 'idle'});");
add("<div class=\"check-item ${item.ok ? 'ok' : 'bad'}\">",
    "<div class=\"check-item ${item.state || (item.ok ? 'ok' : 'bad')}\">");

if (n) fs.writeFileSync(f, t);
console.log('applied:', n);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.check-item.idle')) {
  css += '\n/* A metric that has not been recorded yet is neutral, not a failure. */\n' +
    '.check-item.idle{border-color:var(--line);background:var(--surface)}\n' +
    '.check-item.idle .check-dot{background:var(--line)}\n' +
    '.check-item.idle strong{color:var(--muted)}\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  idle styles');
}
