import fs from 'node:fs';
const file = 'tools/one-off/training-library.mjs';
let t = fs.readFileSync(file, 'utf8');
const from = "    return {startDate: start, sessions, deload, days, reasons,`],\n  ],";
const to = "    return {startDate: start, sessions, deload, days, reasons,`,\n  ],";
if (!t.includes(from)) throw new Error('anchor missing');
fs.writeFileSync(file, t.replace(from, to));
console.log('bracket fixed');
