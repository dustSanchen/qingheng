import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const names = ['.notice{','.notice.error{','.warn-text{','.check-item.bad{','.check-item.ok{','.tone-energy{','.tone-warn{','.tone-fat{','.diet-bar i.over{','.diet-key.over{'];
for (const n of names) {
  const i = css.indexOf(n);
  if (i < 0) { console.log('MISS', n); continue; }
  const end = css.indexOf('}', i) + 1;
  console.log(css.slice(i, end).replace(/\s+/g,' '));
}
