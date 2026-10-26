import fs from 'node:fs';
const file = 'app/src/main/assets/training-principles.js';
let t = fs.readFileSync(file, 'utf8');
const ids = ['stretch-after-training', 'foam-roll-legs', 'desk-neck-release'];
let removed = 0;
for (const id of ids) {
  const re = new RegExp("\\r?\\n    \\{\\r?\\n      id: '" + id + "',[\\s\\S]*?\\r?\\n    \\},", 'g');
  const matches = [...t.matchAll(re)];
  if (matches.length > 1) {
    // keep the first, drop the rest
    for (let i = matches.length - 1; i >= 1; i--) {
      const m = matches[i];
      t = t.slice(0, m.index) + t.slice(m.index + m[0].length);
      removed++;
    }
  }
}
fs.writeFileSync(file, t);
const lib = new Function('window', fs.readFileSync(file,'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
const set = new Set(lib.rules.map(r => r.id));
console.log('removed blocks:', removed, 'rules:', lib.rules.length, 'unique:', set.size);
