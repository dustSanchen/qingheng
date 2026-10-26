import fs from 'node:fs';
const lib = new Function('window', fs.readFileSync('app/src/main/assets/training-principles.js','utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
const seen = new Map();
for (const r of lib.rules) seen.set(r.id, (seen.get(r.id) || 0) + 1);
console.log('rules:', lib.rules.length);
for (const [id, n] of seen) if (n > 1) console.log('dup:', id, 'x' + n);
