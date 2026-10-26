import fs from 'node:fs';
const t = fs.readFileSync('tests/food-database.test.mjs','utf8');
for (const l of t.split(/\r?\n/)) if (/10 次|每分钟|readFileSync/.test(l)) console.log(l.trim().slice(0,150));
