import fs from 'node:fs';
const f='tests/lean-targets.test.mjs';
let t=fs.readFileSync(f,'utf8');
t=t.replace("lean.warnings.some(w => w.includes('硬底线') && w.includes('能更快'))","lean.warnings.some(w => w.includes('硬底线') && w.includes('想更快'))");
fs.writeFileSync(f,t);
console.log('assertion fixed');
