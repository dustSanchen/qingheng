import fs from 'node:fs';
const f = 'app/src/fragments/60-training-copy.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const from = "clamp01(1 - distance / width), state: sum.calories === 0 ? 'idle' : undefined});";
const to = "clamp01(1 - distance / width), state: sum.calories === 0 ? 'idle' : (sum.calories < range.min ? 'low' : sum.calories > range.max ? 'high' : undefined)});";
if (t.split(from).length - 1 !== 1) { console.log('anchor count:', t.split(from).length - 1); process.exit(1); }
fs.writeFileSync(f, t.replace(from, to));
console.log('ok  calories low/high');
