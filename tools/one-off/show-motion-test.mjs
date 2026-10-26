import fs from 'node:fs';
const t = fs.readFileSync('tests/icons-motion.test.mjs','utf8');
const i = t.indexOf('compositor-friendly');
console.log(t.slice(Math.max(0,i-500), i+200));
