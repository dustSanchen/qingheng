import fs from 'node:fs';
const t = fs.readFileSync('tests/icons-motion.test.mjs','utf8');
const i = t.indexOf('search results enter as rows');
console.log(t.slice(Math.max(0,i-700), i+120));
